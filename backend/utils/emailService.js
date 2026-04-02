require('dotenv').config();
const axios = require('axios');

const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        // Log for debugging
        console.log('='.repeat(60));
        console.log('PASSWORD RESET REQUESTED');
        console.log('Email:', email);
        console.log('Reset URL:', resetUrl);
        console.log('API Key exists:', !!process.env.BREVO_API_KEY);
        console.log('='.repeat(60));
        
        // Send email using Brevo API
        const emailData = {
            sender: {
                name: "RankOtaku",
                email: "kpatil800083@gmail.com"
            },
            to: [{
                email: email
            }],
            subject: "Reset Your RankOtaku Password",
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #f6c902, #ffd700); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: bold;">RankOtaku</h1>
                        <p style="color: #333; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">We received a request to reset your password. Click the button below to create a new password:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: #f6c902; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #f6c902; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 14px;">${resetUrl}</p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                        
                        <p style="color: #999; font-size: 14px; margin-bottom: 10px;">This link will expire in 1 hour for security reasons.</p>
                        <p style="color: #999; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                        <p>© 2024 RankOtaku. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            }
        });

        console.log('Email sent successfully via Brevo API:', response.data);
        return response.data;
        
    } catch (error) {
        console.error('Email sending error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendPasswordResetEmail };
