import mongoose from 'mongoose';
import { dbconfig } from './config';

const Schema = mongoose.Schema;

const buslistSchema = new Schema({
  name: String,
  type: String,
});

export const Models = {
	realtimelist: mongoose.model('realtimelist', buslistSchema, 'realtimelist')
};

export const mongodb = function(dbname = 'user') {
	const { host, port } = dbconfig;
	mongoose.connect(`mongodb://${host}:${port}/${dbname}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	});
	const db = mongoose.connection;
	console.log(`------ 启动mongoDB连接 ${host}:${port} ------`);
	db.once('open', () => {
		console.log('---------- mongodb connected ----------');
	});
	db.on('error', console.error.bind(console, 'MongoDB 连接错误：'));
};
