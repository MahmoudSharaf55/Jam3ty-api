const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.GRID_API_KEY);
module.exports = (name,email,code)=>{
    sgMail.send({
        to: email,
        from: 'mahmoudsharf55@gmail.com',
        subject: 'Verify your account',
        text: `مرحبا ${name},`+'\n'+`رمز التحقق الخاص بك هو `+code+'\n'+'شكراً لك.'+'\n'+'جامعتي',
    });
};