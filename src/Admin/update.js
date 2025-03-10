const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../model/admin');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const Main = require("../model/audio"); // Use the Main model
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

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

module.exports = UpdateAdmin = async (req, res) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1]; // 'Bearer <token>' formatidan tokenni ajratib olish;

    jwt.verify(token, 'java', async (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        } else {
            try {
                const adminId = req.params.id;
                const updateFields = req.body;  
                const audioFiles = req.file ? req.file : null; 
                console.log(audioFiles);
                let audioURL = ''
                if(audioFiles){
                    audioURL = await uploadToS3(audioFiles);
                }

                const admin = await Admin.findById(adminId);

                if (!admin) {
                    return res.status(404).json({ error: 'Admin not found' });
                }

                if (updateFields.firstname) {
                    admin.firstname = updateFields.firstname;
                }
                if (updateFields.lastname) {
                    admin.lastname = updateFields.lastname;
                }
                if (updateFields.email) {
                    admin.email = updateFields.email;
                }
                if (updateFields.username) {
                    admin.username = updateFields.username;
                }
                if (updateFields.password) {
                    admin.password = updateFields.password;
                }
                if (audioURL) {
                    admin.image = audioURL;
                }

                await admin.save();
                return res.status(200).json({ message: 'Admin updated successfully', admin });
            } catch (error) {
                console.error('Error updating admin:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
};
