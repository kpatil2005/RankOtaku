const nodemailer = require('nodemailer');
const axios = require('axios');

const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        // Verify API key is configured
        if (!process.env.BREVO_API_KEY) {
            console.error('Missing Brevo API key');
            throw new Error('Email service not configured');
        }

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        // Use Brevo API instead of SMTP (works on Render free tier)
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: 'RankOtaku', email: 'kpatil800083@gmail.com' },
                to: [{ email }],
                subject: 'Password Reset Request - RankOtaku',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="font-family: 'Bangers', cursive; font-size: 48px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">RANKOTAKU</h1>
                        </div>
                        
                        <div style="background: #1a1a1a; padding: 30px; border: 1px solid #333;">
                            <h2 style="color: #ffd700; margin-top: 0;">PASSWORD RESET REQUEST</h2>
                            <p style="color: #ccc; line-height: 1.6;">You requested to reset your password. Click the button below to create a new password:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #000; text-decoration: none; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">RESET PASSWORD</a>
                            </div>
                            
                            <p style="color: #888; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                            <p style="color: #ffd700; word-break: break-all; font-size: 14px;">${resetUrl}</p>
                            
                            <p style="color: #888; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
                            <p style="color: #888; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                            <p>&copy; 2024 RankOtaku. All rights reserved.</p>
                        </div>
                    </div>
                `
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Password reset email sent via Brevo API:', response.data.messageId);
        return response.data;
    } catch (error) {
        console.error('Email sending error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendPasswordResetEmail };
