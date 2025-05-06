exports.alphabetValidator = (alpha) => {
    const re = /^[a-zA-Z0-9]+$/;
  
    const valid = re.test(alpha);
    if (valid) {
      return ;
    } else {
      return "Invalid Name";
    }
  };
  
  exports.contactValidator = (phone) => {
    const re = /^[0-9]{10,11}$/; // Regex for 10 to 11 digits only
    const valid = re.test(phone);
    if (valid) {
      return;
    } else {
      return "Invalid Phone No.";
    }
  };

  exports.countryCodeValidator = (countryCode) => {
    // Regex for validating country code (e.g., +1 for USA)
    const re = /^\+\d{1,3}$/; 
    const valid = re.test(countryCode);
    if (valid) {
      return;
    } else {
      return "Invalid Country Code.";
    }
  };


  exports.generateRandomString = (length) => {
    if (length === undefined) {
      length = 10;
    }
    const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCase = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const specialChars = "!@#";

    const mandatoryChars = [
      upperCase[Math.floor(Math.random() * upperCase.length)],
      lowerCase[Math.floor(Math.random() * lowerCase.length)],
      digits[Math.floor(Math.random() * digits.length)],
      specialChars[Math.floor(Math.random() * specialChars.length)],
    ];

    const allChars = upperCase + lowerCase + digits + specialChars;
    const remainingLength = length - mandatoryChars.length;

    const randomChars = Array.from(
      { length: remainingLength },
      () => allChars[Math.floor(Math.random() * allChars.length)]
    );

    const combinedChars = [...mandatoryChars, ...randomChars];
    for (let i = combinedChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combinedChars[i], combinedChars[j]] = [
        combinedChars[j],
        combinedChars[i],
      ];
    }

    return combinedChars.join("");
  };

exports.generateDefaultPassword = (user) => {
  if (user.user_first_name.length < 4) {
    if (user.user_last_name.length < 4) {
      password =
        user.user_first_name.toUpperCase() +
        user.user_last_name.toUpperCase() +
        "@" +
        user.contact_no.toString().slice(0, 4);
      if (password.length < 8) {
        password =
          user_email.slice(0, 8 - password.length).toUpperCase() + password;
      }
    } else {
      password =
        user.user_first_name.toUpperCase() +
        user.user_last_name
          .slice(0, 4 - user.user_first_name.length)
          .toUpperCase() +
        "@" +
        user.contact_no.toString().slice(0, 4);
    }
  } else {
    password =
      user.user_first_name.slice(0, 4).toUpperCase() +
      "@" +
      user.contact_no.toString().slice(0, 4);
  }

  return password;
};