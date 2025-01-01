import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from 'url';
import pg from "pg";
import session from 'express-session';
import bcrypt from 'bcrypt';
import passport from "passport";
import multer from "multer";
import env from "dotenv";

env.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const port = 3000;

app.use('/uploads', express.static('uploads'));

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});
  
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");


app.use(session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: false,
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
 });



// Route to render the login/signup page
app.get("/", (req, res) => {
    res.render("auth.ejs");
});

// Signup route with password hashing
app.post("/signup", async(req, res) => {
    const name = req.body.text;
    const email = req.body.email;
    const password = req.body.pswd;

    try {
        // Hash password before saving to the database
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        const re = await db.query("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", 
            [name, email, hashedPassword]
        );
        res.redirect("/login");
        console.log(re);
    } catch (error) {
        console.log(error);
        res.send("Error signing up");
    }
});

// Login route with password comparison
app.post("/login", async(req, res) => {
    const email = req.body.email;
    const password = req.body.pswd;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
            // Compare passwords using bcrypt
            const isMatch = await bcrypt.compare(password, result.rows[0].password);
            if (isMatch) {
                // Store user id in session after successful login
                req.session.userId = result.rows[0].id;
                res.redirect("/Home");
            } else {
                res.send("Password is incorrect");
            }
        } else {
            res.send("Email not found");
        }
    } catch (error) {
        console.log(error);
        res.send("Error logging in");
    }
});

// Home route to display blog posts
app.get("/Home", async(req, res) => {
    try {
        const results = await db.query("SELECT * FROM blogs ORDER BY id DESC");
        res.render("index.ejs", { posts: results.rows || [] });
        
    } catch (error) {
        console.log(error);
        res.render("index.ejs", { posts: [] });
    }
});

// Add route to display the add blog page
app.get("/add", (req, res) => {
    res.render("add.ejs");
});

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect("/"); // Redirect to login page
    }
};

const isAuthor = async (req, res, next) => {
    const blogId = req.body.id || req.params.id;
    const userId = req.session.userId;

    try {
        const result = await db.query("SELECT user_id FROM blogs WHERE id = $1", [blogId]);
        if (result.rows.length > 0 && result.rows[0].user_id === userId) {
            next();
        } else {
            res.status(403).send("Unauthorized to edit this blog");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Error checking authorization");
    }
};

//logout route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

app.post("/submit", isAuthenticated , upload.single('image'), async(req, res) => {
    const header = req.body.head;
    const data = req.body.desci;
    const userId = req.session.userId;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    console.log(imageUrl);

    try {
        await db.query("INSERT INTO blogs(user_id, title, content, image_url) VALUES($1, $2, $3, $4)", 
            [userId, header, data, imageUrl]
        );
        res.redirect("/Home");
    } catch (error) {
        console.log(error);
        res.send("Error submitting the blog");
    }
});

// Route to view more content (use query params or URL params)
app.get("/more_content/:id", isAuthenticated ,async(req, res) => {
    
        const id = req.params.id;
        let user1 = false;
        try {
            const result = await db.query("SELECT * FROM blogs WHERE id = $1", [id]);
            if (result.rows.length > 0) {
                const blog = result.rows[0];
                const user_id = blog.user_id;
                
                if(req.session.userId == user_id){
                    user1 = true;
                }
                
                res.render("content.ejs", {
                    post: blog,
                    user : user1
                });
            } else {
                res.send("Post not found");
            }
            console.log(user1);
        } catch (error) {
            console.log(error);
            res.send("Error fetching the blog");
        }

    
});

app.get("/update/:id", async(req, res) => {
    const id = req.params.id;
    try {
        const result = await db.query("SELECT * FROM blogs WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            res.render("edit.ejs", { post: result.rows[0] });
        } else {
            res.send("Post not found");
        }
    }catch (error) {    
        console.log(error);
        res.send("Error fetching the blog");
    }
});

app.post("/edit/:id", isAuthenticated, upload.single('image_url'), async(req, res) => {
    const id = req.params.id;
    const header = req.body.title;
    const data = req.body.content;
    const userId = req.session.userId;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.existing_image_url;
    console.log(req.file);

    try {
        const resu = await db.query("UPDATE blogs SET title = $1, content = $2, image_url = $3, user_id = $4 WHERE id = $5", 
            [header, data, imageUrl, userId, id]
        );
        res.redirect("/Home");
    } catch (error) {
        console.log(error);
        res.send("Error updating the blog");
    }
});

app.get("/delete/:id", isAuthenticated, isAuthor, async(req, res) => {
    const id  = req.params.id;

    try {
        await db.query("DELETE FROM blogs WHERE id = $1", [id]);
        res.redirect("/Home");
    } catch (error) {
        console.log(error);
        res.send("Error deleting the blog");
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
