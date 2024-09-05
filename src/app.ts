import express from 'express';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import Queue, { type Job } from 'bull';

const app = express();
app.use(bodyParser.json());

const emailQueue = new Queue('email', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
    },
});

type EmailRequest = {
    from: string;
    to: string;
    subject: string;
    text: string;
};

const sendNewEmail = async (emailRequest: EmailRequest) => {
    emailQueue.add({...emailRequest});
}

const processEmailQueue = async (job: Job) => {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
        tls: { rejectUnauthorized: false },
    });

    const { from, to, subject, text } = job.data;
    console.log('Sending email to %s', to);

    let info = await transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        text: text,
        html: `<b>${text}</b>`,
    }); 

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return nodemailer.getTestMessageUrl(info);
};

emailQueue.process(processEmailQueue);

app.post('/send-email', async (req, res) => {
    const { from, to, subject, text } = req.body;
    await sendNewEmail({ from, to, subject, text });

    console.log('added email to queue');
    res.json({ message: 'email sent' });
});

app.listen(4300, () => {
    console.log('Server is running on http://localhost:4300');
});