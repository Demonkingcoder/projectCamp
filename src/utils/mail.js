import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
    // Creating Mailgen Instance
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagerlink.com"
        }
    })

    const emailHtml = mailGenerator.generate(options.mailgenContent)
    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)

    // transporter object
    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS
        }
    })

    const mail = {
        from: "mail.taskmanager@example.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    }

    try{
        await transporter.sendMail(mail)
        console.log("Mail sent!!")
    }catch(error) {
        console.error("Email service failed silently. Make sure that you have provided your MAILTRAP credentials in the .env file")
        console.error("Error: ", error);
    }
}

const emailVerificationMailgenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "Welcome to our App! we are excited to have you onboard.",
            action: {
                instructions:
                "To verify your email click on the following button",
                button: {
                    color: "#22BC66",
                    link: verificationUrl,
                }
            },
            outro: "Need help, or have questions? just reply to this email, we had love to help."
        },
    };
};


const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
    return {
        body: {
            name: username,
            intro: "We got the request to reset the password of your account",
            action: {
                instructions:
                "To reset your password click on the following button or link",
                button: {
                    color: "#22BC66",
                    link: passwordResetUrl,
                }
            },
            outro: "Need help, or have questions? just reply to this email, we had love to help."
        },
    };
};

export{
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent,
    sendEmail
}