from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_networking_lab'

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'recipes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

#Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    recipes = db.relationship('Recipe', backref='owner', lazy=True)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    servings = db.Column(db.Integer, nullable=False)
    ingredients = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ratings = db.relationship('Rating', backref='recipe', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='recipe', lazy=True, cascade="all, delete-orphan")

class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stars = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    username = db.Column(db.String(80))

#Page Routes
@app.route('/')
def index():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

@app.route('/recipe/<int:recipe_id>')
def recipe_detail(recipe_id):
    if 'user_id' not in session: return redirect(url_for('login'))
    recipe = Recipe.query.get_or_404(recipe_id)
    
    ratings = Rating.query.filter_by(recipe_id=recipe_id).all()
    avg_rating = sum([r.stars for r in ratings]) / len(ratings) if ratings else 0
    is_owner = (recipe.user_id == session['user_id'])
    
    return render_template('recipe_detail.html', 
                           recipe=recipe, 
                           avg_rating=round(avg_rating, 1), 
                           is_owner=is_owner)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect(url_for('index'))
        return "Invalid login", 401
    return render_template('login.html')

@app.route('/create_account', methods=['GET', 'POST'])
def create_account():
    if request.method == 'POST':
        username, password, confirm = request.form['username'], request.form['password'], request.form['confirm_password']
        if password != confirm: return "Passwords do not match", 400
        if User.query.filter_by(username=username).first(): return "Username already exists", 400
        new_user = User(username=username, password=generate_password_hash(password))
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('create_account.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    results = Recipe.query.filter((Recipe.name.contains(query)) | (Recipe.ingredients.contains(query))).all() if query else []
    return render_template('search_results.html', results=results, query=query)

#API Routes
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    all_recipes = Recipe.query.all()
    output = []
    for r in all_recipes:
        ratings = Rating.query.filter_by(recipe_id=r.id).all()
        avg_rating = sum([rt.stars for rt in ratings]) / len(ratings) if ratings else 0
        output.append({
            'id': r.id, 'name': r.name, 'servings': r.servings,
            'creator': r.owner.username, 'avg_rating': round(avg_rating, 1)
        })
    return jsonify(output)

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    new_recipe = Recipe(name=data['name'], servings=data['servings'], 
                        ingredients=data.get('ingredients'), user_id=session['user_id'])
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify({'id': new_recipe.id}), 201

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    recipe = Recipe.query.filter_by(id=recipe_id, user_id=session['user_id']).first()
    if recipe:
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Unauthorized'}), 404

@app.route('/api/recipes/<int:recipe_id>/rate', methods=['POST'])
def rate_recipe(recipe_id):
    data = request.json
    rating = Rating.query.filter_by(user_id=session['user_id'], recipe_id=recipe_id).first()
    if rating: rating.stars = data['stars']
    else: db.session.add(Rating(stars=data['stars'], user_id=session['user_id'], recipe_id=recipe_id))
    db.session.commit()
    return jsonify({'message': 'Rated'}), 200

@app.route('/api/recipes/<int:recipe_id>/comment', methods=['POST'])
def add_comment(recipe_id):
    data = request.json
    db.session.add(Comment(text=data['text'], user_id=session['user_id'], 
                           recipe_id=recipe_id, username=session['username']))
    db.session.commit()
    return jsonify({'message': 'Commented'}), 201

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    app.run(debug=True, port=5000)
