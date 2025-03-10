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
      Key: `${uuidv4()}.mp3`,
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
const CreateById = async (req, res) => {
  try {
    const { uz, ru } = req.body;
    const { id } = req.params;
    const uzData = JSON.parse(uz);
    const ruData = JSON.parse(ru);

    if (!ruData.title || !ruData.description || !uzData.title || !uzData.description) {
      return res.status(400).json({ error: 'Missing required fields for updating the nested audio entry.' });
    }

    const mainAudio = await Main.findById(id).maxTimeMS(30000);

    if (!mainAudio) {
      return res.status(404).json({ error: 'Main Audio document not found.' });
    }

    const audioFiles = req.files['audio'];

    if (!audioFiles || audioFiles.length === 0) {
      return res.status(400).json({ error: 'No audio files provided.' });
    }

    const audioId = uuidv4(); // Generate a unique ID for the audio entry

    // Fayllarni bir marta yuklab, URLni ikkala massiv uchun ishlatamiz
    const uploadedAudios = await Promise.all(
      audioFiles.map(async (audio) => {
        const audioURL = await uploadToS3(audio);
        return audioURL;
      })
    );

    // Ikkala til uchun URLdan foydalanib obyektlarni hosil qilamiz
    const ruAudioEntries = uploadedAudios.map((audioURL) => ({
      _id: id,
      id: audioId,
      title: ruData.title,
      description: ruData.description,
      audio: audioURL,
    }));

    const uzAudioEntries = uploadedAudios.map((audioURL) => ({
      _id: id,
      id: audioId,
      title: uzData.title,
      description: uzData.description,
      audio: audioURL,
    }));

    mainAudio.ru.audios.push(...ruAudioEntries);
    mainAudio.uz.audios.push(...uzAudioEntries);

    const updatedMainAudio = await mainAudio.save();

    if (updatedMainAudio) {
      res.status(200).json({ message: 'Nested audio entries updated successfully', data: updatedMainAudio });
    } else {
      throw new Error('Failed to update the nested audio entries.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error.', detailedError: error.message });
  }
};

module.exports = CreateById;




