const convertToUnit = (number) => {
  if (number < 1000) {
    return number;
  } else if (number >= 1000 && number < 1000000) {
    number /= 1000;
    return number.toPrecision(3) + "k";
  } else if (number >= 1000000 && number < 1000000000) {
    number /= 1000000;
    return number.toPrecision(2) + "M";
  } else {
    number /= 1000000000;
    return number.toPrecision(2) + "B";
  }
};
export default convertToUnit;
