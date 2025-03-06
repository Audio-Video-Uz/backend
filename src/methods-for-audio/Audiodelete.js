const AWS = require('aws-sdk');
const AudioSchema = require("../model/audio");

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

// Faylni DigitalOcean S3'dan o'chirish funksiyasi
const deleteFromS3 = async (fileURL) => {
  try {
    // Fayl URL'idan `Key`ni olish
    const key = fileURL.split('audio-uploads/')[1];
    if (!key) {
      console.error(`Invalid file URL: ${fileURL}`);
      throw new Error(`Invalid file URL: ${fileURL}`);
    }

    const params = {
      Bucket: 'audio-uploads',
      Key: key,
    };

    console.log(`Attempting to delete file: ${key}`);
    const response = await s3.deleteObject(params).promise();
    console.log(`Successfully deleted file: ${key}`);
    return response;
  } catch (err) {
    console.error(`Error deleting file: ${fileURL}`, err.message);
    throw err;
  }
};

// Cardni o'chirish funksiyasi
module.exports = async function deleteAudio(req, res) {
  const { id } = req.params;

  try {
    const audioEntry = await AudioSchema.findById(id);
    if (!audioEntry) {
      return res.status(404).json({ error: 'Audio entry not found.' });
    }

    const deletionPromises = [];

    // Har bir faylni o'chirish uchun vazifalarni qo'shamiz
    if (audioEntry.smallaudio) {
      deletionPromises.push(deleteFromS3(audioEntry.smallaudio));
    }
    if (audioEntry.image) {
      deletionPromises.push(deleteFromS3(audioEntry.image));
    }
    if (audioEntry.video) {
      deletionPromises.push(deleteFromS3(audioEntry.video));
    }

    if (audioEntry.audios && audioEntry.audios.length > 0) {
      audioEntry.audios.forEach((item) => {
        if (item.audio) {
          deletionPromises.push(deleteFromS3(item.audio));
        }
      });
    }

    // Barcha fayllarni o'chirish jarayonini kutamiz
    const deletionResults = await Promise.allSettled(deletionPromises);
    deletionResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`File deletion ${index + 1}: SUCCESS`);
      } else {
        console.error(`File deletion ${index + 1}: FAILED`, result.reason.message);
      }
    });

    // Bazadan yozuvni o'chirish
    const deletedAudioEntry = await AudioSchema.findByIdAndDelete(id);
    res.status(200).json({
      message: 'Audio entry and associated files successfully deleted.',
      deletedAudioEntry,
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid audio entry ID format.' });
    }
    res.status(500).json({ error: 'Internal Server Error. Failed to delete the audio entry.' });
  }
};