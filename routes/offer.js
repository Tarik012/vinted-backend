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
const User = require("../models/User");

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
      const { title, description, price, brand, size, condition, color, city } =
        req.body;
      console.log(req.headers);

      if (title && price && req.files?.picture) {
        // Création de la nouvelle annonce (sans l'image)
        const newOffer = new Offer({
          product_name: title,
          product_description: description,
          product_price: price,
          product_details: [
            { MARQUE: brand },
            { TAILLE: size },
            { ÉTAT: condition },
            { COULEUR: color },
            { EMPLACEMENT: city },
          ],
          owner: req.user,
        });

        // Vérifier le type de fichier
        if (
          Array.isArray(req.files.picture) === true ||
          req.files.picture.mimetype.slice(0, 5) !== "image"
        ) {
          res
            .status(400)
            .json({ message: "You must send a single image file !" });
        } else {
          // Envoi de l'image à cloudinary
          const result = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture, "vinted_upload", {
              folder: `api/vinted-v2/offers/${newOffer._id}`,
              public_id: "preview",
              cloud_name: "lereacteur",
            })
          );

          // ajout de l'image dans newOffer
          newOffer.product_image = result;
          await newOffer.save();
          res.json(newOffer);
        }
      } else {
        res
          .status(400)
          .json({ message: "title, price and picture are required" });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ message: error.message });
    }
  }
);

/****************************************************************************************************************************/
router.put(
  "/offer/update/:id",
  isAuthenticated,
  fileupload(),
  async (req, res) => {
    //console.log(req.params.id);
    const offerToModify = await Offer.findById(req.params.id);
    try {
      if (req.body.title) {
        offerToModify.product_name = req.body.title;
      }
      if (req.body.description) {
        offerToModify.product_description = req.body.description;
      }
      if (req.body.price) {
        offerToModify.product_price = req.body.price;
      }

      const details = offerToModify.product_details;
      //console.log(req.body);
      //console.log(req.body.product_details[0].MARQUE);
      //console.log(req.body.brand);
      for (i = 0; i < details.length; i++) {
        if (details[i].MARQUE) {
          if (req.body.brand) {
            details[i].MARQUE = req.body.brand;
          }
        }
        if (details[i].TAILLE) {
          if (req.body.size) {
            details[i].TAILLE = req.body.size;
          }
        }
        if (details[i].ÉTAT) {
          if (req.body.condition) {
            details[i].ÉTAT = req.body.condition;
          }
        }
        if (details[i].COULEUR) {
          if (req.body.color) {
            details[i].COULEUR = req.body.color;
          }
        }
        if (details[i].EMPLACEMENT) {
          if (req.body.location) {
            details[i].EMPLACEMENT = req.body.location;
          }
        }
      }

      if (req.files?.picture) {
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture, {
            public_id: `api/vinted/offers/${offerToModify._id}/preview`,
          })
        );
        offerToModify.product_image = result;
      }

      //console.log(offerToModify);

      await offerToModify.save();

      res.status(200).json("Offer modified succesfully !");
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  }
);

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
    //console.log("req.query =>", req.query);

    let { title, priceMin, priceMax, sort, page, offersByPage } = req.query;

    // const filters = {};

    // if (title) {
    //   //console.log(value);
    //   filters.product_name = new RegExp(title, "i");
    //   //console.log(filters);
    // }

    // if (priceMin) {
    //   filters.product_price = { $gte: Number(priceMin) };
    //   //console.log(filters);
    // }

    // if (priceMax) {
    //   if (!filters.product_price) {
    //     filters.product_price = { $lte: Number(priceMax) };
    //   } else {
    //     filters.product_price.$lte = Number(priceMax);
    //   }
    // }

    /* ou construire le filtre avec un filtre parent et des filtres enfant  */

    const filters = {};

    filters.product_name = new RegExp(title, "i");

    const filterPrice = {};
    filterPrice.product_price = {};
    filterPrice.product_price.$gte = Number(priceMin);
    filterPrice.product_price.$lte = Number(priceMax);

    filters.product_price = filterPrice.product_price;

    const filterSort = {};
    if (sort === "price-desc") filterSort.product_price = "desc";
    if (sort === "price-asc") filterSort.product_price = "asc";

    // console.log(filters);
    // console.log(filterSort);

    if (Number(page) < 1) {
      page = 1;
    } else {
      page = Number(page);
    }

    const limit = offersByPage; // je définis mon nombre d'articles par page à afficher

    const skip = (page - 1) * limit; // ignorer les x résultats

    const offers = await Offer.find(filters)
      .sort(filterSort)
      .skip(skip)
      .limit(limit)
      .select("product_name product_price")
      .populate({ path: "owner", select: "account _id" });

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const offerCount = await Offer.countDocuments(filters);
    console.log(offerCount);

    //console.log(offers);
    res.json({
      count: offerCount,
      offers: offers,
    });

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
    const offerById = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
    });
    res.json(offerById);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
