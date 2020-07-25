const validator = require('validator');
const eduEmail = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-]+)\.?([a-zA-Z0-9_\-])+?\.edu\.([a-zA-Z]{2,3})$/;
console.log(validator.isEmail('mahmoud@ci.menofia.edu.eg'));
console.log(eduEmail.test('mahmoud@ci.menofia.edu.eg'));