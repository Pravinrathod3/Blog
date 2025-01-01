# Blog Website

A fully functional Blog Website that allows users to create, view, edit, and delete blogs. The website includes features such as user authentication, CRUD operations, and a clean, user-friendly interface.

## Features

### 1. **User Authentication**
- **Sign Up Page**: Allows users to create an account.
- **Sign In Page**: Enables existing users to log in securely.

### 2. **Home Page**
- Displays all blog posts in the form of cards.
- Provides a quick overview of blog content.

### 3. **Add Blog Page**
- Enables logged-in users to create a new blog post.
- Includes a rich text editor for formatting blog content.

### 4. **View Blog (See More Page)**
- Allows users to view the full content of a selected blog post.

### 5. **Edit and Delete Features**
- **Edit**: Users can update the content of their blogs.
- **Delete**: Users can permanently remove their blogs.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express js, EJS
- **Database**: PostgreSQL

## Installation and Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory and include the following:
   ```
   PORT=3000
   DATABASE_URL=<your-database-url>
   SESSION_SECRET=<your-session-secret>
   ```

4. **Run the Application**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## Future Enhancements
- Add a comments section for blog posts.
- Implement categories and tags for blogs.
- Improve UI/UX with animations and better responsiveness.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch.
3. Commit your changes.
4. Push the branch and create a pull request.

## Contact
For any inquiries or suggestions, feel free to reach out:
- Email: pravinrathod4532@gmail.com
