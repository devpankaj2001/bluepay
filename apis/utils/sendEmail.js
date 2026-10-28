const nodemailer = require('nodemailer');

const sendEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or any other service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP from BluePay',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h1 style="color: #4A90E2;">BluePay Verification</h1>
                    <p style="font-size: 16px;">Thank you for registering with BluePay. Please use the following OTP to verify your account:</p>
                    <div style="margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; color: #333;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #777;">This OTP is valid for 10 minutes.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = sendEmail;
