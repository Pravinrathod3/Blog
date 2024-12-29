import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from 'url';
import pg from "pg";
import session from 'express-session';
import bcrypt from 'bcrypt';
import passport from "passport";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const port = 3000;

app.use('/uploads', express.static('uploads'));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Blog_Website",
    password: "pravin4532",
    port: 5432
});
  
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.use(session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: true,
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Route to render the login/signup page
app.get("/", (req, res) => {
    res.render("auth.ejs");
});

// Signup route with password hashing
app.post("/signup", async(req, res) => {
    const name = req.body.txt;
    const email = req.body.email;
    const password = req.body.pswd;

    try {
        // Hash password before saving to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        const re = await db.query("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", 
            [name, email, hashedPassword]
        );
        res.redirect("/Home");
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
        console.log(results.rows);
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
app.get("/more_content/:id", async(req, res) => {
    
        const id = req.params.id;
        const userId = req.session.userId;
        try {
            const result = await db.query("SELECT * FROM blogs WHERE id = $1", [id]);
            if (result.rows.length > 0) {
                const blog = result.rows[0];
                res.render("content.ejs", {
                    post: blog,
                    user : userId
                });
            } else {
                res.send("Post not found");
            }
        } catch (error) {
            console.log(error);
            res.send("Error fetching the blog");
        }

    
});

app.patch("/update", async(req, res) => {
    const { id, title, content } = req.body;

    try {
        await db.query("UPDATE blogs SET title = $1, content = $2 WHERE id = $3", 
            [title, content, id]
        );
        res.redirect("/Home");
    } catch (error) {
        console.log(error);
        res.send("Error updating the blog");
    }
});

app.get("/delete/:id", async(req, res) => {
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
