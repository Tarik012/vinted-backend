const User = require("../models/User");

/****************************************************************************************
 *                      Fonction du middleware:                                         *
 *      - isAuthenticated: permets de valider l'authentification du user via son token  *
 *                                                                                      *
 *                                                                                      *
 ****************************************************************************************/

const isAuthenticated = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = req.headers.authorization.replace("Bearer ", "");
    //console.log("Le token du user=>",token);

    //const user = await User.findOne({ token: token });
    const user = await User.findOne({ token: token }).select("account"); // si on veut uniquement _id et la clé account
    if (user === null) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    //console.log("Infos du user avec son token=>", user);
    req.user = user; //ajouter une clé user à req contenant les infos du user
    //console.log(req.user);

    next(); // on passe dans la route offer/publish
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = isAuthenticated;
