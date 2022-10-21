const express = require("express");

const fileupload = require("express-fileupload"); //package pour upload files, permets aussi de le passage du form-data
const cloudinary = require("cloudinary").v2; //service hébergeur fichiers

//authentification sur cloudinary
cloudinary.config({
  cloud_name: "dbftzatex",
  api_key: "239368722137521",
  api_secret: "VmStqPJObPagjywxI7slvYY36po",
  secure: true,
});

const router = express.Router();

const Offer = require("../models/Offer");

const isAuthenticated = require("../middlewares/isAuthenticated");

//fonction qui convertit le fichier à uploader
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

//convertToBase64(req.files.pictures[0]);

/****************************************************************************************************************************
 *                      Routes OFFER:                                                                                       *
 *      - /offer/publish => service qui permets à l'utilisateur de publier une offre en ajoutant un article dans la base    *
 *      - /offer/update => service qui permets de modifier un article en base depuis son id                                 *                           *
 *      - /offer/delete => service qui permets de supprimer un article en base depuis son id                                *
 *      - /offers => service qui permets de récupérer un tableau contenant l'ensemble des annonces,                         *
 *                   ainsi que le nombre total d'annonces. Si des filtres sont passés à la route,                           *
 *                   le tableau retourné ne devra contenir que les annonces qui correspondent à la recherche et             *
 *                   le nombre d'annonces trouvées.                                                                         *
 ***************************************************************************************************************************/
router.post(
  "/offer/publish",
  isAuthenticated,
  fileupload(), //me permets de récupérer req.body
  async (req, res) => {
    try {
      const {
        price,
        condition,
        city,
        brand,
        size,
        color,
        description,
        picture,
        title,
      } = req.body;
      //console.log("Infos du user =>", req.user);
      //console.log("Contenu du body - form-data=>", req.body);
      //console.log("Contenu du req.files.picture=>", req.files.picture);

      //conversion du fichier
      const pictureConverted = convertToBase64(req.files.picture);
      //console.log(pictureConverted);

      //console.log(req.user);

      let result = "";
      //upload du fichier
      if (req.files?.picture) {
        result = await cloudinary.uploader.upload(pictureConverted, {
          folder: `vinted/offers`,
        });
      }

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user,
        product_image: result,
      });

      //console.log("result=>", result);

      //console.log("New offer =>", newOffer);

      await newOffer.save();

      res.send(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

/****************************************************************************************************************************/
router.put("/offer/update", isAuthenticated, fileupload(), async (req, res) => {
  try {
    const { id, price } = req.body;
    //console.log(req.body);

    const updatedOffer = await Offer.findById(req.body.id);

    if (!updatedOffer) {
      return res.status(401).json({ error: "unable to modify this offer" });
    }

    updatedOffer.product_price = price;

    await updatedOffer.save();

    res.send(updatedOffer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/****************************************************************************************************************************/
router.delete(
  "/offer/delete",
  isAuthenticated,
  fileupload(),
  async (req, res) => {
    try {
      if (req.body.id) {
        const deletedOffer = await Offer.findById(req.body.id);

        if (!deletedOffer) {
          return res.status(401).json({ error: "unable to delete this offer" });
        }

        await deletedOffer.delete();
      } else {
        res.status(400).json({ error: "missing parametrer" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/****************************************************************************************************************************/
router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page, offersByPage } = req.query;

    /* ou construire le filtre avec un filtre parent et des filtres enfant
    
    const filters = {};
      const filter = {};

  filter.product_price = {};
  filter.product_price.$gte = 20;
  filter.product_price.$lte = 50;

  filters.product_price = filter.product_price;

  console.log(filter);
  */

    //console.log("req.query =>", req.query);

    const filters = {};

    if (title) {
      //console.log(value);
      filters.product_name = new RegExp(title, "i");
      //console.log(filters);
    }

    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
      //console.log(filters);
    }

    if (priceMax) {
      if (!filters.product_price) {
        filters.product_price = { $lte: Number(priceMax) };
      } else {
        filters.product_price.$lte = Number(priceMax);
      }
    }

    const sortFilter = {};
    if (sort === "price-desc") {
      sortFilter.product_price = "desc";
    } else if (sort === "price-asc") {
      sortFilter.product_price = "asc";
    }

    //console.log(sortFilter);

    //console.log("filters =>", filters);
    //console.log("RangePrice =>", rangePrice);

    const limit = 2; // je définis mon nombre d'articles par page à afficher
    let pageRequired = 1;
    if (page) {
      pageRequired = Number(page);
    }

    const skip = (pageRequired - 1) * limit;

    const offers = await Offer.find(filters)
      .sort(sortFilter)
      .skip(skip)
      .limit(limit)
      .select("product_name product_price")
      .populate("owner", "account _id");

    const offerCount = await Offer.countDocuments();
    //console.log(offerCount);

    //console.log(offers);
    res.json(offers);

    //res.send("OK");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/******************************************************************************************************************** * 
Route offer aqui attend un paramètre id juste après offer. Dans Postman, on renseigne directement l'id dans l'URL 
A METTRE EN DESSOUS DE LA ROUTE OFFER/PUBLISH 
************************************************************************************************************************/
router.get("/offer/:id", async (req, res) => {
  try {
    //console.log(req.params);
    const offerById = await Offer.findById(req.params.id).populate(
      "owner",
      "account _id"
    );
    res.json(offerById);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
