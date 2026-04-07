from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_networking_lab'

#Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'recipes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

#Database Models

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # Relationship: This allows us to call user.recipes to see their list
    recipes = db.relationship('Recipe', backref='owner', lazy=True)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    servings = db.Column(db.Integer, nullable=False)
    # Foreign Key: Links the recipe to a specific User ID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

#Routes

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id  # Store the ID for database filtering
            session['username'] = user.username
            return redirect(url_for('index'))
        return "Invalid login", 401
    return render_template('login.html')

@app.route('/create_account', methods=['GET', 'POST'])
def create_account():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm = request.form['confirm_password']

        if password != confirm:
            return "Passwords do not match", 400
        
        if User.query.filter_by(username=username).first():
            return "Username already exists", 400

        hashed_pw = generate_password_hash(password)
        new_user = User(username=username, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('create_account.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

#API Routes (For the Dashboard)

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    #Filter: ONLY get recipes belonging to the logged-in user
    user_recipes = Recipe.query.filter_by(user_id=session['user_id']).all()
    return jsonify([{'id': r.id, 'name': r.name, 'servings': r.servings} for r in user_recipes])

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    new_recipe = Recipe(
        name=data['name'], 
        servings=data['servings'], 
        user_id=session['user_id'] # Tag the recipe with the user's ID
    )
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe added'}), 201

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    #Secure Delete: Only delete if the recipe belongs to the logged-in user
    recipe = Recipe.query.filter_by(id=recipe_id, user_id=session['user_id']).first()
    if recipe:
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Not found or unauthorized'}), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
