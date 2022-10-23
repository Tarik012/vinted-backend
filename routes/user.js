const express = require("express");

const uid2 = require("uid2"); // Package qui sert à créer des string aléatoires
const SHA256 = require("crypto-js/sha256"); // Sert à encripter une string
const encBase64 = require("crypto-js/enc-base64"); // Sert à transformer l'encryptage en string

const router = express.Router();

const User = require("../models/User");
const Offer = require("../models/Offer");

const fileupload = require("express-fileupload"); //package pour upload files, permets aussi de le passage du form-data
const cloudinary = require("cloudinary").v2; //service hébergeur fichiers

//authentification sur cloudinary
cloudinary.config({
  cloud_name: "dbftzatex",
  api_key: "239368722137521",
  api_secret: "VmStqPJObPagjywxI7slvYY36po",
  secure: true,
});

//fonction qui convertit le fichier à uploader
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

/**************************  Route SignUp ***********************************/
router.post("/user/signup", fileupload(), async (req, res) => {
  //res.send("OK");
  console.log(req.body);

  const { username, email, password, newsletter } = req.body;
  try {
    // Vérifier que le username est renseigné
    if (
      !username ||
      !email ||
      !password ||
      (newsletter !== "true" && newsletter !== "false")
    ) {
      return res.status(400).json({ message: "missing parameter !!" });
    }

    // Vérifier la disponibilité de l'adresse mail
    const existEmail = await User.findOne({ email }); //utiliser toujours findOne car find() renvoie un tableau
    //et donc il faut tester le longueur du tableau dans la condition if(existEmail)
    //console.log("existEmail=>", existEmail);
    if (existEmail) {
      return res.status(400).json({ message: "Email not available !!" });
    }

    // l'utilisateur a-t-il bien envoyé les informations requises ?
    if (email && password && username) {
      // Si oui, on peut créer ce nouvel utilisateur

      let result = "";
      //upload du fichier
      if (req.files?.icon_profile) {
        const pictureConverted = convertToBase64(req.files.icon_profile);
        result = await cloudinary.uploader.upload(pictureConverted, {
          folder: `vinted/signup`,
        });
      }

      //Générer un salt
      const salt = uid2(16);
      //console.log("salt=>", salt);

      //Générer un hash
      const hash = SHA256(salt + password).toString(encBase64);
      //console.log("hash=>", hash);

      //Générer un token
      const token = uid2(64);
      //console.log("token=>", token);

      //enregistrer le nouvel utilisateur
      const newUser = new User({
        newsletter, // ou newsletter : newsletter
        token,
        hash,
        salt,
        email,
        account: {
          username: username,
          avatar: result,
        },
      });

      // sauvegarder en base
      await newUser.save();

      // afficher un message en retour
      res.status(200).json({
        _id: newUser._id,
        token,
        email,
        account: {
          username: username,
        },
      });
    } else {
      // l'utilisateur n'a pas envoyé les informations requises ?
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

/**************************  Route Login ***********************************/
router.post("/user/login", async (req, res) => {
  //res.send("OK");

  const { email, password } = req.body;
  try {
    // On va chercher dans notre collection User, un élément dont l'email correspond au mail reçu
    const existUser = await User.findOne({ email });
    //console.log(existUser);
    if (!existUser) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const newHash = SHA256(existUser.salt + password).toString(encBase64);
    //console.log("newHash=>", newHash);
    newHash !== existUser.hash
      ? res.status(401).json({ error: "unauthorized" })
      : res.status(200).json({
          // afficher un message en retour
          _id: existUser._id,
          token: existUser.token,
          account: {
            username: existUser.account.username,
          },
        });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
