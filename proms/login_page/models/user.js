var mongoose = require('mongoose');
var Schema = mongoose.Schema;

userSchema = new Schema( {
	
	unique_id: Number,
	// email: String,
	Mr_no : String,
	username: String,
	password: String,
	passwordConf: String
}),
User = mongoose.model('User', userSchema);

module.exports = User;