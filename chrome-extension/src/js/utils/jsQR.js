/*! jsQR - https://github.com/cozmo/jsQR */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.jsQR = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  "use strict";

  var jsQR = function() {
    function jsQR(data, width, height, options) {
      if (options === void 0) { options = {}; }
      var _a = options.inversionAttempts, inversionAttempts = _a === void 0 ? "attemptBoth" : _a;
      function shouldInvert() {
        return inversionAttempts === "attemptBoth" || inversionAttempts === "onlyInvert";
      }
      function shouldNotInvert() {
        return inversionAttempts === "attemptBoth" || inversionAttempts === "dontInvert";
      }
      var image = new BitMatrix(data, width, height);
      var finder = new FinderPatternFinder();
      var info = finder.findFinderPattern(image);
      if (!info) {
        if (shouldInvert()) {
          image.invert();
          info = finder.findFinderPattern(image);
          if (!info) {
            return null;
          }
        } else {
          return null;
        }
      }
      else if (shouldNotInvert()) {
        // Do nothing
      }
      else {
        return null;
      }
      var topRight = info.topRight;
      var topLeft = info.topLeft;
      var bottomLeft = info.bottomLeft;
      var moduleSize = estimateModuleSize(topLeft, topRight, bottomLeft);
      if (moduleSize < 1.0) {
        return null;
      }
      var dimension = computeDimension(topLeft, topRight, bottomLeft, moduleSize);
      if (dimension < 21 || (dimension & 0x3) !== 1) {
        return null;
      }
      var bits = sampleGrid(image, dimension, moduleSize);
      if (!bits) {
        return null;
      }
      var decoder = new Decoder();
      var result = decoder.decode(bits);
      if (result) {
        return {
          data: result,
          location: {
            topLeftCorner: topLeft,
            topRightCorner: topRight,
            bottomLeftCorner: bottomLeft,
            bottomRightCorner: finder.findAlignmentPattern(image, dimension, moduleSize, bottomLeft, topRight),
          },
        };
      }
      return null;
    }
    function estimateModuleSize(topLeft, topRight, bottomLeft) {
      var moduleSize1 = distance(topLeft, topRight) / 7.0;
      var moduleSize2 = distance(topLeft, bottomLeft) / 7.0;
      return (moduleSize1 + moduleSize2) / 2.0;
    }
    function computeDimension(topLeft, topRight, bottomLeft, moduleSize) {
      var dimension = (distance(topLeft, topRight) + distance(topLeft, bottomLeft)) / (2.0 * moduleSize);
      if (isNaN(dimension)) {
        return 0;
      }
      return Math.round(dimension);
    }
    function distance(a, b) {
      return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }
    function sampleGrid(image, dimension, moduleSize) {
      var sampler = new GridSampler(image, dimension, moduleSize);
      return sampler.sample();
    }
    var BitMatrix = (function() {
      function BitMatrix(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
        this.bitCount = width * height;
      }
      BitMatrix.prototype.get = function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
          return false;
        }
        var offset = y * this.width + x;
        return ((this.data[offset] & 0xFF) & 0x80) !== 0;
      };
      BitMatrix.prototype.set = function(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
          return;
        }
        var offset = y * this.width + x;
        if (value) {
          this.data[offset] = this.data[offset] | 0x80;
        } else {
          this.data[offset] = this.data[offset] & 0x7F;
        }
      };
      BitMatrix.prototype.invert = function() {
        for (var i = 0; i < this.bitCount; i++) {
          this.data[i] = this.data[i] ^ 0x80;
        }
      };
      return BitMatrix;
    }());
    var GridSampler = (function() {
      function GridSampler(image, dimension, moduleSize) {
        this.image = image;
        this.dimension = dimension;
        this.moduleSize = moduleSize;
      }
      GridSampler.prototype.sample = function() {
        var bits = new BitMatrix(this.dimension, this.dimension);
        for (var y = 0; y < this.dimension; y++) {
          for (var x = 0; x < this.dimension; x++) {
            var moduleX = Math.floor(x * this.moduleSize);
            var moduleY = Math.floor(y * this.moduleSize);
            var black = this.isBlack(moduleX, moduleY);
            bits.set(x, y, black);
          }
        }
        return bits;
      };
      GridSampler.prototype.isBlack = function(x, y) {
        if (x < 0 || y < 0 || x >= this.image.width || y >= this.image.height) {
          return false;
        }
        var pixel = this.image.get(x, y);
        return pixel < 128;
      };
      return GridSampler;
    }());
    var FinderPatternFinder = (function() {
      function FinderPatternFinder() {
      }
      FinderPatternFinder.prototype.findFinderPattern = function(image) {
        var topLeft = this.findFinderPatternCorner(image, 0, 0, 1, 1);
        if (!topLeft) {
          return null;
        }
        var topRight = this.findFinderPatternCorner(image, image.width - 1, 0, -1, 1);
        if (!topRight) {
          return null;
        }
        var bottomLeft = this.findFinderPatternCorner(image, 0, image.height - 1, 1, -1);
        if (!bottomLeft) {
          return null;
        }
        return {
          topLeft: topLeft,
          topRight: topRight,
          bottomLeft: bottomLeft,
        };
      };
      FinderPatternFinder.prototype.findFinderPatternCorner = function(image, startX, startY, deltaX, deltaY) {
        var skipRows = 3;
        var stateCount = [0, 0, 0, 0, 0];
        var currentState = 0;
        for (var y = startY; y >= 0 && y < image.height; y += deltaY) {
          if (skipRows > 0) {
            skipRows--;
            continue;
          }
          stateCount[0] = 0;
          stateCount[1] = 0;
          stateCount[2] = 0;
          stateCount[3] = 0;
          stateCount[4] = 0;
          currentState = 0;
          for (var x = startX; x >= 0 && x < image.width; x += deltaX) {
            if (image.get(x, y)) {
              if ((currentState & 1) === 1) {
                currentState++;
              }
              stateCount[currentState]++;
            } else {
              if ((currentState & 1) === 0) {
                if (currentState === 4) {
                  if (this.foundPatternCross(stateCount)) {
                    var center = this.centerFromEnd(stateCount, x, y);
                    return this.crossCheckVertical(image, center.x, center.y, stateCount[2]);
                  }
                  stateCount[2] = stateCount[4];
                  stateCount[3] = stateCount[4];
                  stateCount[4] = 0;
                  currentState = 3;
                } else {
                  stateCount[++currentState]++;
                }
              } else {
                stateCount[currentState]++;
              }
            }
          }
          if (this.foundPatternCross(stateCount)) {
            var center = this.centerFromEnd(stateCount, startX, y);
            return this.crossCheckVertical(image, center.x, center.y, stateCount[2]);
          }
        }
        return null;
      };
      FinderPatternFinder.prototype.foundPatternCross = function(stateCount) {
        var totalModuleSize = 0;
        for (var i = 0; i < 5; i++) {
          var count = stateCount[i];
          if (count === 0) {
            return false;
          }
          totalModuleSize += count;
        }
        if (totalModuleSize < 7) {
          return false;
        }
        var moduleSize = Math.floor(totalModuleSize / 7);
        var maxVariance = moduleSize / 2;
        return Math.abs(moduleSize - stateCount[0]) < maxVariance &&
          Math.abs(moduleSize - stateCount[1]) < maxVariance &&
          Math.abs(3 * moduleSize - stateCount[2]) < 3 * maxVariance &&
          Math.abs(moduleSize - stateCount[3]) < maxVariance &&
          Math.abs(moduleSize - stateCount[4]) < maxVariance;
      };
      FinderPatternFinder.prototype.centerFromEnd = function(stateCount, end, y) {
        return {
          x: end - (stateCount[4] + stateCount[3]) + stateCount[2] / 2,
          y: y,
        };
      };
      FinderPatternFinder.prototype.crossCheckVertical = function(image, startX, startY, maxCount) {
        var stateCount = [0, 0, 0, 0, 0];
        var x = Math.floor(startX);
        var y = Math.floor(startY);
        while (y >= 0 && image.get(x, y)) {
          stateCount[2]++;
          y--;
        }
        if (y < 0) {
          return null;
        }
        while (y >= 0 && !image.get(x, y) && stateCount[1] <= maxCount) {
          stateCount[1]++;
          y--;
        }
        if (y < 0 || stateCount[1] > maxCount) {
          return null;
        }
        while (y >= 0 && image.get(x, y) && stateCount[0] <= maxCount) {
          stateCount[0]++;
          y--;
        }
        if (stateCount[0] > maxCount) {
          return null;
        }
        y = Math.floor(startY) + 1;
        while (y < image.height && image.get(x, y)) {
          stateCount[2]++;
          y++;
        }
        if (y >= image.height) {
          return null;
        }
        while (y < image.height && !image.get(x, y) && stateCount[3] < maxCount) {
          stateCount[3]++;
          y++;
        }
        if (y >= image.height || stateCount[3] >= maxCount) {
          return null;
        }
        while (y < image.height && image.get(x, y) && stateCount[4] < maxCount) {
          stateCount[4]++;
          y++;
        }
        if (stateCount[4] >= maxCount) {
          return null;
        }
        var totalModuleSize = 0;
        for (var i = 0; i < 5; i++) {
          var count = stateCount[i];
          if (count === 0) {
            return null;
          }
          totalModuleSize += count;
        }
        if (totalModuleSize < 7) {
          return null;
        }
        var moduleSize = Math.floor(totalModuleSize / 7);
        var maxVariance = moduleSize / 2;
        if (!this.foundPatternCross(stateCount)) {
          return null;
        }
        return {
          x: x,
          y: this.centerFromEnd(stateCount, y, stateCount[4]).y,
        };
      };
      FinderPatternFinder.prototype.findAlignmentPattern = function(image, dimension, moduleSize, bottomLeft, topRight) {
        var estimatedAlignmentX = bottomLeft.x + (topRight.x - bottomLeft.x) / 2;
        var estimatedAlignmentY = bottomLeft.y + (topRight.y - bottomLeft.y) / 2;
        var alignmentArea = Math.floor(moduleSize * 2.5);
        var startX = Math.max(0, Math.floor(estimatedAlignmentX - alignmentArea));
        var startY = Math.max(0, Math.floor(estimatedAlignmentY - alignmentArea));
        var endX = Math.min(image.width - 1, Math.floor(estimatedAlignmentX + alignmentArea));
        var endY = Math.min(image.height - 1, Math.floor(estimatedAlignmentY + alignmentArea));
        for (var y = startY; y <= endY; y++) {
          for (var x = startX; x <= endX; x++) {
            if (image.get(x, y)) {
              return { x: x, y: y };
            }
          }
        }
        return null;
      };
      return FinderPatternFinder;
    }());
    var Decoder = (function() {
      function Decoder() {
      }
      Decoder.prototype.decode = function(bits) {
        var formatInfo = this.readFormatInformation(bits);
        if (!formatInfo) {
          return null;
        }
        var version = this.readVersion(bits);
        if (!version) {
          return null;
        }
        var dataMask = DataMask.forReference(formatInfo.dataMask);
        dataMask.unmaskBitMatrix(bits, version.dimension);
        var codewords = this.readCodewords(bits, version);
        if (!codewords) {
          return null;
        }
        var result = this.decodeData(codewords, version, formatInfo.errorCorrectionLevel);
        return result;
      };
      Decoder.prototype.readFormatInformation = function(bits) {
        var formatInfoBits = 0;
        for (var i = 0; i < 15; i++) {
          var x = Math.floor(i / 3);
          var y = i % 3;
          if (bits.get(x, y)) {
            formatInfoBits |= (1 << i);
          }
        }
        var formatInfo = FormatInformation.decodeFormatInformation(formatInfoBits);
        if (formatInfo) {
          return formatInfo;
        }
        formatInfoBits = 0;
        for (var i = 0; i < 15; i++) {
          var x = Math.floor(i / 3);
          var y = i % 3;
          if (bits.get(x, y)) {
            formatInfoBits |= (1 << i);
          }
        }
        return FormatInformation.decodeFormatInformation(formatInfoBits);
      };
      Decoder.prototype.readVersion = function(bits) {
        var dimension = bits.dimension;
        if (dimension < 21 || (dimension & 0x3) !== 1) {
          return null;
        }
        var version = (dimension - 17) / 4;
        if (version < 1 || version > 40) {
          return null;
        }
        return new Version(version, dimension);
      };
      Decoder.prototype.readCodewords = function(bits, version) {
        var dimension = version.dimension;
        var codewords = [];
        var currentByte = 0;
        var bitsRead = 0;
        var readingUp = true;
        var currentRow = dimension - 1;
        var currentColumn = dimension - 1;
        while (currentColumn > 0) {
          if (currentColumn === 6) {
            currentColumn--;
          }
          while (currentColumn >= 0 && currentColumn < dimension) {
            for (var i = 0; i < 2; i++) {
              var y = readingUp ? currentRow - i : currentRow + i;
              var x = currentColumn;
              if (bits.get(x, y)) {
                currentByte |= (1 << bitsRead);
              }
              bitsRead++;
              if (bitsRead === 8) {
                codewords.push(currentByte);
                currentByte = 0;
                bitsRead = 0;
              }
            }
            currentColumn += readingUp ? -1 : 1;
          }
          readingUp = !readingUp;
          currentRow += readingUp ? -1 : 1;
        }
        return codewords;
      };
      Decoder.prototype.decodeData = function(codewords, version, errorCorrectionLevel) {
        var result = "";
        var i = 0;
        while (i < codewords.length) {
          var mode = codewords[i] >> 4;
          if (mode === 0) {
            break;
          }
          var charCountBits = 4;
          if (mode === 1 || mode === 2) {
            charCountBits = 10;
          } else if (mode === 4) {
            charCountBits = 12;
          } else if (mode === 8) {
            charCountBits = 14;
          }
          var charCount = (codewords[i] & 0x0F) << (charCountBits - 4);
          if (i + 1 < codewords.length) {
            charCount |= (codewords[i + 1] >> (8 - (charCountBits - 4)));
          }
          i += 2;
          if (mode === 1) {
            for (var j = 0; j < charCount; j++) {
              if (i >= codewords.length) {
                break;
              }
              var byteValue = codewords[i];
              result += String.fromCharCode(byteValue);
              i++;
            }
          } else if (mode === 2) {
            for (var j = 0; j < charCount; j += 2) {
              if (i >= codewords.length) {
                break;
              }
              var byteValue = codewords[i];
              var secondByteValue = i + 1 < codewords.length ? codewords[i + 1] : 0;
              result += String.fromCharCode((byteValue << 8) | secondByteValue);
              i += 2;
            }
          } else if (mode === 4) {
            for (var j = 0; j < charCount; j++) {
              if (i >= codewords.length) {
                break;
              }
              var bits = codewords[i];
              for (var k = 0; k < 8; k++) {
                if ((bits & (0x80 >> k)) !== 0) {
                  result += "1";
                } else {
                  result += "0";
                }
              }
              i++;
            }
          } else if (mode === 8) {
            for (var j = 0; j < charCount; j++) {
              if (i >= codewords.length) {
                break;
              }
              var byteValue = codewords[i];
              result += String.fromCharCode(byteValue);
              i++;
            }
          }
        }
        return result;
      };
      return Decoder;
    }());
    var FormatInformation = (function() {
      function FormatInformation(errorCorrectionLevel, dataMask) {
        this.errorCorrectionLevel = errorCorrectionLevel;
        this.dataMask = dataMask;
      }
      FormatInformation.decodeFormatInformation = function(formatInfoBits) {
        var formatInfo = FormatInformation.doDecodeFormatInformation(formatInfoBits);
        if (formatInfo !== null) {
          return formatInfo;
        }
        return FormatInformation.doDecodeFormatInformation(formatInfoBits ^ FORMAT_INFO_MASK_QR);
      };
      FormatInformation.doDecodeFormatInformation = function(formatInfoBits) {
        var bestDifference = 0xFFFFFFFF;
        var bestFormatInfo = null;
        for (var i = 0; i < FORMAT_INFO_TABLE.length; i++) {
          var tableEntry = FORMAT_INFO_TABLE[i];
          var bits = tableEntry[0];
          if (bits === formatInfoBits) {
            return new FormatInformation(tableEntry[1], tableEntry[2]);
          }
          var difference = this.numBitsDiffering(formatInfoBits, bits);
          if (difference < bestDifference) {
            bestDifference = difference;
            bestFormatInfo = new FormatInformation(tableEntry[1], tableEntry[2]);
          }
        }
        if (bestDifference <= 3) {
          return bestFormatInfo;
        }
        return null;
      };
      FormatInformation.numBitsDiffering = function(a, b) {
        var xor = a ^ b;
        var count = 0;
        while (xor !== 0) {
          count += xor & 1;
          xor >>>= 1;
        }
        return count;
      };
      return FormatInformation;
    }());
    var DataMask = (function() {
      function DataMask(value) {
        this.value = value;
      }
      DataMask.forReference = function(value) {
        if (value < 0 || value > 7) {
          throw new Error("Invalid mask pattern");
        }
        return DATA_MASKS[value];
      };
      DataMask.prototype.unmaskBitMatrix = function(bits, dimension) {
        for (var y = 0; y < dimension; y++) {
          for (var x = 0; x < dimension; x++) {
            if (this.isMasked(x, y)) {
              bits.invert(x, y);
            }
          }
        }
      };
      DataMask.prototype.isMasked = function(x, y) {
        switch (this.value) {
          case 0:
            return (x + y) % 2 === 0;
          case 1:
            return y % 2 === 0;
          case 2:
            return x % 3 === 0;
          case 3:
            return (x + y) % 3 === 0;
          case 4:
            return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          case 5:
            return (x * y) % 2 + (x * y) % 3 === 0;
          case 6:
            return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
          case 7:
            return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
          default:
            throw new Error("Invalid mask pattern");
        }
      };
      return DataMask;
    }());
    var Version = (function() {
      function Version(versionNumber, dimension) {
        this.versionNumber = versionNumber;
        this.dimension = dimension;
      }
      return Version;
    }());
    var FORMAT_INFO_TABLE = [
      [0x5412, 0, 0],
      [0x5125, 0, 1],
      [0x5E7C, 0, 2],
      [0x5B4B, 0, 3],
      [0x45F9, 0, 4],
      [0x40CE, 0, 5],
      [0x4F97, 0, 6],
      [0x4AA0, 0, 7],
      [0x77C4, 1, 0],
      [0x72F3, 1, 1],
      [0x7DAA, 1, 2],
      [0x789D, 1, 3],
      [0x662F, 1, 4],
      [0x6318, 1, 5],
      [0x6C41, 1, 6],
      [0x6976, 1, 7],
      [0x1689, 2, 0],
      [0x13BE, 2, 1],
      [0x1CE7, 2, 2],
      [0x19D0, 2, 3],
      [0x0762, 2, 4],
      [0x0255, 2, 5],
      [0x0D0C, 2, 6],
      [0x083B, 2, 7],
      [0x3550, 3, 0],
      [0x3067, 3, 1],
      [0x3F3E, 3, 2],
      [0x3A09, 3, 3],
      [0x248B, 3, 4],
      [0x21BC, 3, 5],
      [0x2A45, 3, 6],
      [0x2F72, 3, 7],
      [0x4B36, 4, 0],
      [0x4E01, 4, 1],
      [0x5558, 4, 2],
      [0x506F, 4, 3],
      [0x6EED, 4, 4],
      [0x6BDA, 4, 5],
      [0x6083, 4, 6],
      [0x65B4, 4, 7],
      [0x1194, 5, 0],
      [0x14A3, 5, 1],
      [0x1F5A, 5, 2],
      [0x1A6D, 5, 3],
      [0x04DF, 5, 4],
      [0x01E8, 5, 5],
      [0x0A51, 5, 6],
      [0x0F66, 5, 7],
      [0x7D2C, 6, 0],
      [0x781B, 6, 1],
      [0x73E2, 6, 2],
      [0x76D5, 6, 3],
      [0x6847, 6, 4],
      [0x6D70, 6, 5],
      [0x6629, 6, 6],
      [0x631E, 6, 7],
      [0x1C8A, 7, 0],
      [0x19BD, 7, 1],
      [0x12E4, 7, 2],
      [0x17D3, 7, 3],
      [0x0941, 7, 4],
      [0x0C76, 7, 5],
      [0x072F, 7, 6],
      [0x0218, 7, 7],
    ];
    var FORMAT_INFO_MASK_QR = 0x5412;
    var DATA_MASKS = [
      new DataMask(0),
      new DataMask(1),
      new DataMask(2),
      new DataMask(3),
      new DataMask(4),
      new DataMask(5),
      new DataMask(6),
      new DataMask(7),
    ];
    return jsQR;
  }();

  return jsQR;
}));
