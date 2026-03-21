require('dotenv').config();
const { sendPasswordResetEmail } = require('./utils/emailService');

console.log('Testing email service...');
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'EXISTS' : 'MISSING');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

sendPasswordResetEmail('kpatil800083@gmail.com', 'test-token-123')
    .then(() => {
        console.log('✓ Email sent successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Email failed:', error.message);
        process.exit(1);
    });
