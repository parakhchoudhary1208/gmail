var express = require('express');
const passport = require('passport');
var router = express.Router();
const userModel = require("./users");
const mailModel = require("./mails");
const localStrategy = require("passport-local");
const multer = require("multer");

passport.use(new localStrategy(userModel.authenticate()))

function fileFilter (req, file, cb) {
  if(file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" || file.mimetype === "image/png"){
    cb(null, true);
  }
  else{
    cb(new Error("lavde tez chal riya hai!!"));
  }
}

router.get('/check/:username', async function(req, res, next){
  let user  = await userModel.findOne({username: req.params.username})
  res.json({user})
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const fn = Date.now()+ Math.floor(Math.random*100000000) + file.originalname
    cb(null,fn);
  }
})

const upload = multer({ storage: storage, fileFilter: fileFilter })

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.post('/fileupload', isLoggedIn, upload.single('image'), async function(req, res) {
  let loggedInUser = await userModel.findOne({username: req.session.passport.user});
  loggedInUser.profilePic = req.file.filename;
  await loggedInUser.save();
  res.redirect(req.headers.referer);
});

router.get('/profile', isLoggedIn, async function(req, res) {
  let loggedInUser = await userModel
  .findOne({username: req.session.passport.user})
  .populate({
    path: "receivedMails",
    populate: {
      path: "userid",
    },
  })
  res.render("profile",{user: loggedInUser} )

});

router.get('/read/mail/:id', async function(req, res) {
  let mailMilGaya = await mailModel.findOne({_id: req.params.id})
  .populate("userid")
  mailMilGaya.read = true;
  mailMilGaya.save();
  res.render("readmail",{mail: mailMilGaya} )
});

router.get('/read/:id', async function(req, res) {
  let mailGaya = await mailModel.findOne({_id: req.params.id})
  .populate("userid")
  mailGaya.save();
  res.render("readsentmail",{mail: mailGaya} )
});


router.post('/register', function(req, res) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
    gender: req.body.gender,
    mobile: req.body.mobile 
  })

  userModel.register(userData, req.body.password)
  .then(function(reg){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile");
    })
  })
});

router.post("/", passport.authenticate("local",{
  successRedirect: "/profile",
  failureRedirect: "/"
}), function(req, res, next){

});

router.get("/logout", function(req, res){
  req.logout(function(err){
    if(err) throw err;
    res.redirect("/");
  })
})

router.post("/compose", isLoggedIn, async function(req, res){
  const loggedInUser = await userModel.findOne({username: req.session.passport.user}) 

  if(loggedInUser.email !== req.body.receiveremail){
    const createdMail = await mailModel.create({
      userid: loggedInUser._id,
      receiver: req.body.receiveremail,
      mailtext: req.body.mailtext,
    })
  
    loggedInUser.sentMails.push(createdMail._id);
    const loggedInUserUpdated = await loggedInUser.save();
  
    const receiverUser = await userModel.findOne({email: req.body.receiveremail})
    receiverUser.receivedMails.push(createdMail._id);
  
    const updatedReceiverUser = await receiverUser.save();
    res.redirect(req.headers.referer);
  }

  else{
    res.redirect(req.headers.referer);
  }
});



router.get("/register", function(req, res){
  res.render("register")
})

router.get("/sent", isLoggedIn, async function(req, res){
  const foundUser = await userModel.findOne({username: req.session.passport.user})
  .populate({
    path:'sentMails',
    populate:{
      path: 'userid'
    }
  });
  res.render("sent",{user: foundUser})
})

//router.get("/delete/:id", function(req, res){
 // mailModel
  //.findOneAndDelete({mail:req.params.id})
  //.then(function(deleteMail){
 //   res.redirect('/sent')
  //})
//})

router.get('/delete/mail/:id', function(req, res){
  mailModel.findOneAndDelete({_id: req.params.id})
  .then(function(deletedMail){
    res.redirect("back");
  })
})

router.get('/delete/:id', function(req, res){
  mailModel.findOneAndDelete({_id: req.params.id})
  .then(function(deleteMail){
    res.redirect("back");
  })
})

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/");
}

module.exports = router;
