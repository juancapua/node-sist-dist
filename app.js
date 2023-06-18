require('dotenv').config(); 
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const cors = require('cors');

const upload = multer(); 
const express = require('express');
const app = express();
const pool = require('./db');

app.use(express.json());
app.use(cors());

AWS.config.update({
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
});

async function cargarImagenEnS3(imageFile) {
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});

  // Configura los parámetros de carga de S3
  const params = {
    Bucket: process.env.BUCKET,
    Key: imageFile.originalname,
    Body: imageFile.buffer,
  };

  console.log(params.Body)

  try {
    // Carga la imagen en S3
    const uploadResult = await s3.upload(params).promise();
    console.log('Imagen cargada en S3:', uploadResult.Location);

    // Devuelve la URL de la imagen cargada
    return uploadResult.Location;
  } catch (error) {
    console.error('Error al cargar la imagen en S3:', error);
    throw error;
  }
}


// Endpoint para obtener todas las cabañas
app.get('/cabins', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cabins');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener las cabañas:', error);
    res.status(500).json({ error: 'Ocurrió un error al obtener las cabañas' });
  }
});

app.post('/cabins',upload.single('image'), async (req, res) => {
  const file = req.file;
  const { name, price, beds, image } = req.body;

  cargarImagenEnS3(file).then(async url => {
    try {
      const { rows } = await pool.query(
        'INSERT INTO cabins (name, price, beds, image) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, price, beds, url]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error al crear la cabaña:', error);
      res.status(500).json({ error: 'Ocurrió un error al crear la cabaña' });
    }
  })

  
});

// Puerto en el que la API escuchará las peticiones
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});