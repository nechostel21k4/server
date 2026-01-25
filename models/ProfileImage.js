const mongoose = require("mongoose");
const schema = mongoose.Schema;

const imageSchema = new schema({
    username:{type:String,required:true},
    path:{type:String,required:true},
    filename:{type:String,required:true}
})

const ImageModel = mongoose.model("images",imageSchema)

module.exports = {ImageModel}