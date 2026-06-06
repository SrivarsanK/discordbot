/** @format */

const moment = require("moment-timezone");

class Logger {
  static getColorCode(color) {
    const colors = {
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      reset: "\x1b[0m",
      bgBlack: "\x1b[40m",
      bgRed: "\x1b[41m",
      bgGreen: "\x1b[42m",
      bgYellow: "\x1b[43m",
      bgBlue: "\x1b[44m",
      bgMagenta: "\x1b[45m",
      bgCyan: "\x1b[46m",
      bgWhite: "\x1b[47m",
    };
    return colors[color] || colors.reset;
  }

  static log(content, type = "log") {
    const date = `${moment().tz("Asia/Kolkata").format("hh:mm:ss A")}`;
    const reset = this.getColorCode("reset");

    switch (type) {
      case "log": {
        const color = `${this.getColorCode("green")}[${date}]${reset}`;
        const typeColor = `${this.getColorCode("black")}${this.getColorCode(
          "bgCyan",
        )} ${type.toUpperCase()} ${reset}`;
        console.log(`${color}: ${typeColor} ${content}`);
        break;
      }
      case "warn": {
        const color = `${this.getColorCode("red")}[${date}]${reset}`;
        const typeColor = `${this.getColorCode("black")}${this.getColorCode(
          "bgRed",
        )} ${type.toUpperCase()} ${reset}`;
        console.log(`${color}: ${typeColor} ${content}`);
        break;
      }
      case "error": {
        const color = `${this.getColorCode("red")}[${date}]${reset}`;
        const typeColor = `${this.getColorCode("black")}${this.getColorCode(
          "bgRed",
        )} ${type.toUpperCase()} ${reset}`;
        console.log(`${color}: ${typeColor} ${content}`);
        break;
      }
      case "debug":
      case "cmd":
      case "event": {
        const color = `${this.getColorCode("green")}[${date}]${reset}`;
        const typeColor = `${this.getColorCode("black")}${this.getColorCode(
          "bgCyan",
        )} ${type.toUpperCase()} ${reset}`;
        console.log(`${color}: ${typeColor} ${content}`);
        break;
      }
      case "ready": {
        const color = `${this.getColorCode("blue")}[${date}]${reset}`;
        const typeColor = `${this.getColorCode("black")}${this.getColorCode(
          "bgCyan",
        )} ${type.toUpperCase()} ${reset}`;
        console.log(
          `${color}: ${typeColor} ${this.getColorCode(
            "blue",
          )}${content}${reset}`,
        );
        break;
      }
      default:
        throw new TypeError(
          "Logger type must be either warn, debug, log, ready, cmd or error.",
        );
    }
  }
}

module.exports = Logger;
