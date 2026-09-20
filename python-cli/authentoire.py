import io
import os
import sys
import time
import base64
from PIL import Image
from pyzbar import pyzbar
import urllib.parse
try:
    import tomllib
except ImportError:
    import tomli as tomllib
import qrcode
import migration_pb2

try:
    import pyotp
except ImportError:
    print("Warning: pyotp not installed. Code generation will not work.")
    print("Install with: pip install pyotp")
    pyotp = None

# Load configuration from TOML file
def load_config():
    """Load configuration from ../settings.toml"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'settings.toml')
    if not os.path.exists(config_path):
        return {}
    try:
        with open(config_path, 'rb') as f:
            return tomllib.load(f)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        return {}

# Global configuration
CONFIG = load_config()

def parse_otpauth_url(qr_string):
    """Parse otpauth:// URL and extract OTP parameters"""
    if not qr_string.startswith('otpauth://'):
        return None
    
    try:
        # Parse URL
        parsed = urllib.parse.urlparse(qr_string)
        
        # Extract parameters
        params = urllib.parse.parse_qs(parsed.query)
        
        # Get label (format: issuer:name or just name)
        label = parsed.path.lstrip('/')
        if ':' in label:
            issuer, name = label.split(':', 1)
        else:
            name = label
            issuer = params.get('issuer', [name])[0]
        
        return {
            'name': name,
            'issuer': issuer,
            'secret': params.get('secret', [''])[0],
            'algorithm': params.get('algorithm', ['SHA1'])[0],
            'digits': int(params.get('digits', ['6'])[0]),
            'type': parsed.scheme.replace('otpauth://', '')
        }
    except Exception as e:
        print(f"Error parsing OTP URL: {e}")
        return None

def decode_qr_from_image(file_path):
    """Decode QR code from image file"""
    debug_enabled = CONFIG.get('debug', {}).get('debug_enabled', False)
    verbose_errors = CONFIG.get('ui', {}).get('verbose_errors', False)
    
    try:
        if debug_enabled:
            print(f"Attempting to decode QR code from: {file_path}")
        
        image = Image.open(file_path)
        decoded_objects = pyzbar.decode(image)
        
        if debug_enabled:
            print(f"Found {len(decoded_objects)} QR codes in image")
        
        if not decoded_objects:
            if verbose_errors:
                print("No QR codes detected. Ensure the image contains a clear, high-contrast QR code.")
            return None
            
        # Return the first QR code data
        qr_data = decoded_objects[0].data.decode('utf-8')
        decoded_data = urllib.parse.unquote(qr_data)
        
        if debug_enabled:
            print(f"Raw QR data: {qr_data}")
            print(f"Decoded QR data: {decoded_data}")
        
        return decoded_data
    except Exception as e:
        if verbose_errors:
            print(f"Error decoding QR code: {e}")
            print("Make sure you have the required dependencies installed: pip install Pillow pyzbar")
        else:
            print(f"Error decoding QR code: {e}")
        return None

def parse_migration_qr(qr_data):
    """Parse Google Authenticator migration QR code using manual protobuf parsing"""
    debug_enabled = CONFIG.get('debug', {}).get('debug_enabled', False)
    
    try:
        # Extract the data parameter from the migration URL
        data = qr_data.split("data=")[1]
        parsed = urllib.parse.unquote(data)
        
        decoded_data = base64.b64decode(parsed)
        
        migration = migration_pb2.MigrationPayload()
        migration.ParseFromString(decoded_data)
        
        otp_entries = []
        for otp in migration.otp_parameters:
            # Convert bytes secret to base32 string
            secret_b32 = base64.b32encode(otp.secret).decode('utf-8')
            
            # Map algorithm enum to string
            algorithm_map = {
                0: 'ALGO_INVALID',
                1: 'ALGO_SHA1',
                2: 'ALGO_SHA256', 
                3: 'ALGO_SHA512',
                4: 'ALGO_MD5'
            }
            algorithm_str = algorithm_map.get(otp.algorithm, 'ALGO_SHA1').replace('ALGO_', '')
            
            # Map type enum to string
            type_map = {
                0: 'OTP_INVALID',
                1: 'OTP_HOTP',
                2: 'OTP_TOTP'
            }
            otp_type_str = type_map.get(otp.type, 'OTP_TOTP').replace('OTP_', '')
            
            # Use issuer if available, otherwise use name
            issuer_str = otp.issuer if otp.issuer else otp.name
            
            otp_entries.append({
                'name': otp.name,
                'issuer': issuer_str,
                'secret': secret_b32,
                'algorithm': algorithm_str,
                'digits': otp.digits if otp.digits > 0 else 6,
                'type': otp_type_str
            })
        
        return otp_entries
        
    except Exception as e:
        print(f"Error parsing migration QR code: {e}")
        print("Note: This might be due to protobuf parsing issues.")
        return None

def generate_qr_code(otp_entry):
    """Generate QR code for OTP entry"""
    try:
        # Create otpauth URL
        otpauth_url = f"otpauth://totp/{otp_entry['issuer']}:{otp_entry['name']}?secret={otp_entry['secret']}&issuer={otp_entry['issuer']}&algorithm={otp_entry['algorithm']}&digits={otp_entry['digits']}"
        
        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=1,
            border=1,
        )
        qr.add_data(otpauth_url)
        qr.make(fit=True)

        buf = io.StringIO()
        qr.print_ascii(out=buf, invert=True)
        return buf.getvalue()

    except Exception as e:
        return f"Error generating QR code: {e}"

def generate_totp_code(otp_entry):
    """Generate current TOTP code"""
    if not pyotp:
        return "pyotp not installed"
    
    try:
        totp = pyotp.TOTP(otp_entry['secret'])
        return totp.now()
    except Exception as e:
        return f"Error: {e}"

def display_code_with_countdown(otp_entry):
    """Display TOTP code with countdown timer and QR code"""
    debug_enabled = CONFIG.get('debug', {}).get('debug_enabled', False)
    
    try:
        while True:
            # Generate current TOTP code
            code = generate_totp_code(otp_entry)
            
            # Calculate time remaining until next code
            current_time = int(time.time())
            time_remaining = 30 - (current_time % 30)  # TOTP refreshes every 30 seconds
            
            # Generate QR code
            qr_code = generate_qr_code(otp_entry)
            
            # Clear screen (platform independent)
            os.system('cls' if os.name == 'nt' else 'clear')
            
            # Display header
            print(f"🔐 {otp_entry['issuer']} - {otp_entry['name']}")
            print("=" * 50)
            print()
            
            # Display QR code
            print("📱 QR Code:")
            print(qr_code)
            print()
            
            # Display current code
            print(f"🔢 Current Code: {code}")
            print(f"⏰ Refreshes in: {time_remaining:02d} seconds")
            print()
            print("Press Enter to return to menu, or Ctrl+C to exit...")
            print("=" * 50)
            
            if debug_enabled:
                print(f"Debug: Time remaining: {time_remaining}s")
                print(f"Debug: Current epoch: {current_time}")
            
            # Wait for user input with timeout
            import select
            import sys
            
            # Wait for either Enter key or timeout
            ready, _, _ = select.select([sys.stdin], [], [], 1)  # 1 second timeout
            
            if ready:
                # User pressed Enter, return to menu
                user_input = sys.stdin.readline().strip()
                return  # Return to menu instead of breaking
            
            # Continue loop for countdown
            
    except KeyboardInterrupt:
        print("\n👋 Exiting...")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        return

def interactive_mode(file_path):
    """Interactive mode with issuer selection and code generation"""
    debug_enabled = CONFIG.get('debug', {}).get('debug_enabled', False)
    
    if debug_enabled:
        print(f"Loading QR codes from: {file_path}")
    
    # Decode all QR codes from image
    try:
        qr_data = decode_qr_from_image(file_path)
        if not qr_data:
            print("No valid OTP entries found in QR codes")
            return
        
        # Parse the QR data
        if qr_data.startswith('otpauth://'):
            # Single OTP entry
            otp_entry = parse_otpauth_url(qr_data)
            if otp_entry:
                while True:
                    # Show menu for single entry
                    print(f"\n🎉 Found 1 OTP entry:")
                    print("=" * 50)
                    print(f"1. {otp_entry['issuer']} - {otp_entry['name']}")
                    print("=" * 50)
                    
                    choice = input(f"\nPress Enter for interactive mode, or 'q' to quit: ").strip().lower()
                    
                    if choice == 'q':
                        break
                    
                    # Start interactive display
                    print(f"\n🚀 Starting interactive mode for: {otp_entry['issuer']} - {otp_entry['name']}")
                    display_code_with_countdown(otp_entry)
                    
                    # After returning from countdown, loop will show menu again
            else:
                print("Failed to parse OTP URL")
        elif qr_data.startswith('otpauth-migration://'):
            # Migration QR with multiple entries
            otp_entries = parse_migration_qr(qr_data)
            if otp_entries:
                while True:
                    print(f"\n🎉 Found {len(otp_entries)} OTP entries in migration QR code:")
                    print("=" * 50)
                    for i, entry in enumerate(otp_entries):
                        print(f"{i + 1}. {entry['issuer']} - {entry['name']}")
                    print("=" * 50)
                    
                    choice = input(f"\nSelect entry (1-{len(otp_entries)}) for interactive mode, or 'q' to quit: ").strip().lower()
                    
                    if choice == 'q':
                        break
                    
                    if choice:
                        try:
                            entry_index = int(choice) - 1
                            if 0 <= entry_index < len(otp_entries):
                                selected_entry = otp_entries[entry_index]
                                print(f"\n🚀 Starting interactive mode for: {selected_entry['issuer']} - {selected_entry['name']}")
                                display_code_with_countdown(selected_entry)
                                
                                # After returning from countdown, loop will show menu again
                            else:
                                print("Invalid selection")
                        except ValueError:
                            print("Invalid input")
                
                if debug_enabled:
                    # Display all entries in detail
                    print(f"\n📋 All OTP Entries Details:")
                    for i, entry in enumerate(otp_entries):
                        print(f"\n{i + 1}. {entry['issuer']} - {entry['name']}")
                        print(f"   Secret: {entry['secret']}")
                        print(f"   Algorithm: {entry['algorithm']}")
                        print(f"   Digits: {entry['digits']}")
                        print(f"   Type: {entry['type']}")
            else:
                print("Failed to parse migration QR code")
        else:
            print(f"Unknown QR format: {qr_data[:50]}... Expected otpauth:// or otpauth-migration:// format.")
            
    except Exception as e:
        print(f"Error in interactive mode: {e}")

def main():
    # Get debug settings from configuration
    debug_enabled = CONFIG.get('debug', {}).get('debug_enabled', False)
    verbose_errors = CONFIG.get('ui', {}).get('verbose_errors', False)
    
    if debug_enabled:
        print("Debug mode enabled")
        print(f"Configuration loaded: {bool(CONFIG)}")
    
    args = [a for a in sys.argv[1:] if a != '--interactive']
    if not args:
        print("Usage: python authentoire.py [--interactive] <qr_image_path>")
        sys.exit(1)

    file_path = args[0]
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)

    if debug_enabled:
        print(f"Processing file: {file_path}")

    interactive_mode(file_path)

if __name__ == "__main__":
    main()
