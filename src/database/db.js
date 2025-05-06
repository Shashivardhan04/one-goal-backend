require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.DB_URL;

mongoose.connect(URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  // useFindAndModify: false,
  useUnifiedTopology: true, //this is to avoid deprecation warning
});

const connection = mongoose.connection;

try {
  connection.once('open', () => {
    console.log('DB is running');
  });
} catch (error) {
  console.log('Error while connecting DB');

  console.log(error.message);
}
