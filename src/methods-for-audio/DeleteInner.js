const AWS = require('aws-sdk');
const path = require('path');
const Main = require("../model/audio");

// DigitalOcean S3 konfiguratsiyasi
const secretAccessKey = "K0051mkrMw4wQnP66jn1YIrplhVBiTk";
const accessKeyId = "005341d4d1773e10000000002";

AWS.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: 'us-east-005',
  endpoint: new AWS.Endpoint('https://s3.us-east-005.backblazeb2.com'), // Endpointda 2 ta `s`
  s3ForcePathStyle: true,
});

const s3 = new AWS.S3();

// S3'dan fayl o'chirish
const deleteFromS3 = async (url) => {
  try {
    const key = url.split('audio-uploads/')[1]; // URL'dan keyni olish
    if (!key) {
      console.log(key);
      console.log(url);
      throw new Error(`Fayl nomi URL ichidan olinmadi: ${url}`);
    }

    const params = {
      Bucket: 'audio-uploads', // Bucket nomida 1 ta `s`
      Key: key,
    };

    // Faylni o'chirish
    await s3.deleteObject(params).promise();
    console.log(`Deleted file from S3: ${key}`);
  } catch (error) {
    console.error(`Error deleting file from S3: ${url}`, error);
    throw error;
  }
};

const delteInner = async (req, res) => {
  try {
    const { id, id2 } = req.params;

    // DB'dan asosiy ma'lumotni olish
    const mainAudio = await Main.findById(id).maxTimeMS(30000);
    if (!mainAudio) {
      return res.status(404).json({ error: 'Main Audio document not found.' });
    }

    // "ru" va "uz" ma'lumotlar ichidan audio ma'lumotni qidirish
    const ruAudio = mainAudio.ru.audios.find(audio => audio.id === id2);
    const uzAudio = mainAudio.uz.audios.find(audio => audio.id === id2);

    if (!ruAudio && !uzAudio) {
      return res.status(404).json({ error: 'Audio entry not found.' });
    }

    // S3'dan o'chirish
    if (ruAudio?.url) {
      console.log(`Attempting to delete from S3: ${ruAudio.url}`);
      await deleteFromS3(ruAudio.url);
    }
    if (uzAudio?.url) {
      console.log(`Attempting to delete from S3: ${uzAudio.url}`);
      await deleteFromS3(uzAudio.url);
    }

    // Ma'lumotni DB'dan o'chirish
    mainAudio.ru.audios = mainAudio.ru.audios.filter(audio => audio.id !== id2);
    mainAudio.uz.audios = mainAudio.uz.audios.filter(audio => audio.id !== id2);

    // Yangilangan ma'lumotni saqlash
    const updatedMainAudio = await mainAudio.save();

    res.status(200).json({ message: 'Audio entry deleted successfully', data: updatedMainAudio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error.', detailedError: error.message });
  }
};

module.exports = delteInner;