const nodemailer = require('nodemailer');
const axios = require('axios');

const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        // For now, just log the reset link (disable email sending)
        console.log('='.repeat(60));
        console.log('PASSWORD RESET REQUESTED');
        console.log('Email:', email);
        console.log('Reset URL:', resetUrl);
        console.log('='.repeat(60));
        
        // Return success without actually sending email
        return { messageId: 'logged-only' };
    } catch (error) {
        console.error('Email sending error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendPasswordResetEmail };
