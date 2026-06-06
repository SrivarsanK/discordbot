/** @format */

module.exports = {
  convertTime: function (duration) {
    const milliseconds = parseInt((duration % 1000) / 100),
      seconds = parseInt((duration / 1000) % 60),
      minutes = parseInt((duration / (1000 * 60)) % 60),
      hours = parseInt((duration / (1000 * 60 * 60)) % 24);

    const formattedHours = hours < 10 ? "0" + hours : hours;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

    if (duration < 3600000) {
      return formattedMinutes + ":" + formattedSeconds;
    } else {
      return formattedHours + ":" + formattedMinutes + ":" + formattedSeconds;
    }
  },

  convertNumber: function (number, decPlaces) {
    decPlaces = Math.pow(10, decPlaces);

    const abbrev = ["K", "M", "B", "T"];

    for (let i = abbrev.length - 1; i >= 0; i--) {
      const size = Math.pow(10, (i + 1) * 3);

      if (size <= number) {
        number = Math.round((number * decPlaces) / size) / decPlaces;

        if (number == 1000 && i < abbrev.length - 1) {
          number = 1;
          i++;
        }

        number += abbrev[i];

        break;
      }
    }

    return number;
  },

  chunk: function (arr, size) {
    const temp = [];
    for (let i = 0; i < arr.length; i += size) {
      temp.push(arr.slice(i, i + size));
    }
    return temp;
  },

  convertHmsToMs: function (hms) {
    const a = hms.split(":"); // Fix: Declare 'a' before using it

    if (hms.length < 3) {
      return +a[0] * 1000;
    } else if (hms.length < 6) {
      return (+a[0] * 60 + +a[1]) * 1000;
    } else {
      return (+a[0] * 60 * 60 + +a[1] * 60 + +a[2]) * 1000;
    }
  },
};
