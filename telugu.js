const axios = require("axios");

const Translator8000 = async (name) => {
  const options = {
    method: "POST",
    url: "https://openl-translate.p.rapidapi.com/translate",
    headers: {
      "x-rapidapi-key": "d3d00ee08bmsh2e65d060d3b8bc8p12bde9jsn4e046d031016",
      "x-rapidapi-host": "openl-translate.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      target_lang: "te",
      text: name,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const Translator2Lakhs = async (name) => {
  const options = {
    method: "POST",
    url: "https://deep-translate1.p.rapidapi.com/language/translate/v2",
    headers: {
      "x-rapidapi-key": "d3d00ee08bmsh2e65d060d3b8bc8p12bde9jsn4e046d031016",
      "x-rapidapi-host": "deep-translate1.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      q: name,
      source: "en",
      target: "te",
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

Translator8000("sreenu").then((data)=>{
  console.log("translator 8000: ",data)
})

Translator2Lakhs("srinu").then((data)=>{
  console.log("translator 2 lakhs : ",data)
})
