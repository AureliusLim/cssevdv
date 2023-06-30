const express = require('express');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://aureliuslim2:KXHGXFVVPC5LAOsm@cluster0.qmyar.mongodb.net/?retryWrites=true&w=majority";
const fileUpload = require('express-fileupload');
const bcrypt = require('bcrypt');
const Account = require('./model/accountSchema');
const path = require('path');
const app = express();
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const port = 4000;


// Set up the 'hbs' view engine
app.set('view engine', 'hbs');
app.use(express.static(__dirname));
app.use(express.json());
app.use(fileUpload());
app.set('views', './frontend');
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(session({
  secret: 'supersecretsessionkeynamedyomadalimakuha',
  resave: false,
  saveUninitialized: false
}))

const ensureAuth = (req, res, next) => { //for the future pag di na res.render yung login lang
  if (req.session.auth)
    next()
  else
    res.redirect('/')
}

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // maximum of 10 login attempts
  message: "Too many login attempts, please try again later"
})

// Define a route for '/register' to render the registration template
app.get('/', (req, res) => {
  res.render('login.hbs');
});
// Handle the login form submission
app.post('/login', loginLimit, async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
  
    try {
      // Find the user by email
      const user = await Account.findOne({ email : email });
        console.log(email)
      if (user) {
        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (isMatch) {
          // Passwords match, user is authenticated
          req.session.auth = true;

          if(user.role == "user"){// default login
            res.render('main.hbs');
          }
          else{// user is an admin
            req.session.isAdmin = true
            res.redirect('/administration')
          }
          
          //res.send('Login successful');
        } else {
          // Passwords do not match
          res.send('Invalid credentials');
        }
      } else {
        // User not found
        res.send('invalid credentials');
      }
    } catch (err) {
      console.log(err);
      res.send('Error occurred');
    }
  });

// Logout Function
app.get('/logout', (req, res) => {
  res.render('login.hbs');
});

// Administration Function
app.get('/administration', ensureAuth, async (req, res) => {
  const users = await Account.find({role:"user"});
  console.log("the users:")
  console.log(users)
  res.render('administration.hbs', {
    users: users
  })
})

// Direct to registration hbs
app.get('/register', (req, res) => {
  res.render('registration.hbs');
});

app.post('/registerdetails', async (req, res) => {
  try{
      const profphoto = req.files.profilephoto;
      const fullname = req.body.fullname;
      const email = req.body.email;
      const phone = req.body.phone;
      const password = req.body.password;

      // Input validation using regular expressions
      const emailRegex = /^[a-zA-Z0-9]+([_.-][a-zA-Z0-9])*@[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$/;
      const phoneRegex = /^09\d{9}$/;
      if (!emailRegex.test(email)) {
        res.send('<script>alert("Invalid email format"); window.location.href = "/register";</script>');
        return;
      }

      if (!phoneRegex.test(phone)) {
        res.send('<script>alert("Invalid phone number"); window.location.href = "/register";</script>');
        return;
      }
    
      // Check if any of the input fields are empty
      if (!profphoto || !fullname || !email || !phone || !password) {
        res.send('<script>alert("Please fill in all fields"); window.location.href = "/register";</script>');
        return;
      }

       // Check if the email already exists in the database
      const existingUser = await Account.findOne({ email });
      if (existingUser) {
        res.send('<script>alert("Email already registered"); window.location.href = "/register";</script>');
        return;
      }
      
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
    
        const account = await Account.create({
          fullName: fullname,
          email: email,
          phoneNumber: phone,
          profilePhoto: "images/" + profphoto.name,
          password: hashedPassword, // Store the hashed password in the database
          role: "user"
        });
    
        const uploadPath = path.join(__dirname, 'images', profphoto.name);
        profphoto.mv(uploadPath, (error) => {
          if (error) {
            console.log(error);
          } else {
            console.log("ADDED");
            console.log(account);
            res.render('login.hbs')
          }
        });
      } catch (err) {
        console.log(err);
      }
  }
  catch(err){
    res.send('<script>alert("Something went wrong"); window.location.href = "/register";</script>');
    return;
  }

  
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
