const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../model/admin');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// AWS Configuration
const secretAccessKey = "K0051mkrMw4wQnP66jn1YIrplhVBiTk";
const accessKeyId = "005341d4d1773e10000000002";

AWS.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: 'us-east-005',
  endpoint: new AWS.Endpoint('https://s3.us-east-005.backblazeb2.com'),
  s3ForcePathStyle: true,
});

const s3 = new AWS.S3();
const uploadToS3 = async (file) => {
    try {
        const fileContent = await fs.readFile(file.path);
        const params = {
            Bucket: 'audio-uploads',
            Key: `${uuidv4()}.png`,
            Body: fileContent,
        };
        const uploadedData = await s3.upload(params).promise();
        console.log('Uploaded to S3:', uploadedData.Location);
        return uploadedData.Location;
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw error;
    }
};

module.exports = CreateAdmin = async (req, res) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1]; // 'Bearer <token>' formatidan tokenni ajratib olish
    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    jwt.verify(token, 'java', async (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        } else {
            try {
                const updateFields = req.body;  

                const CustomerBlog = new Admin({
                  id: uuidv4(),
                  firstname: updateFields.firstname,
                  lastname: updateFields.lastname,
                  email: updateFields.email,
                  username: updateFields.email.split("@")[0],
                  password: generatePassword(12, updateFields.email, updateFields.email.split("@")[0])
                }); 

                await CustomerBlog.save();
                return res.status(200).json({ message: 'Admin created successfully', CustomerBlog });
            } catch (error) {
                console.error('Error creating admin:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
};

// generatePassword function - passwodni yaratadi
function generatePassword(length, email, username) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  const hyphenPositions = [4, 8];

  for (let i = 0; i < length; i++) {
      if (hyphenPositions.includes(i)) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          password += '-' + characters[randomIndex];
      } else {
          const randomIndex = Math.floor(Math.random() * characters.length);
          password += characters[randomIndex];
      }
  }

  sendRegistrationEmail(email, password, username);  // Email yuborish uchun function chaqirish
  return password;
}

// sendRegistrationEmail function - foydalanuvchiga vaqtinchalik parol yuboradi
async function sendRegistrationEmail(email, temporaryPassword, username) {
  try {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'jaloliddinzokirov.dev@gmail.com',
            pass: 'qkwz qdam wxbs gbwl'
        },
    });

    let mailOptions = {
      from: 'jaloliddinzokirov.dev@gmail.com',
      to: email,
      subject: 'Your Temporary Password for Registration',
      text: `Hello ${username}.\n\nYour temporary password is: ${temporaryPassword}.\n\nPlease use this password to log in and set your permanent password.\n\nThank you!`
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}