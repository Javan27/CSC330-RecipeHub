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
    recipes = db.relationship('Recipe', backref='owner', lazy=True)

class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.String(50), nullable=False) 
    unit = db.Column(db.String(20), nullable=True)     
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    servings = db.Column(db.Integer, nullable=False)
    instructions = db.Column(db.Text, nullable=True)
    ingredients = db.relationship('Ingredient', backref='recipe', lazy=True, cascade="all, delete-orphan")
    tags = db.Column(db.String(200), nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    forked_from = db.Column(db.String(80), nullable=True)
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

@app.route('/feed')
def feed():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    recipes = Recipe.query.filter_by(is_public=True).order_by(Recipe.id.desc()).all()
    return render_template('feed.html', recipes=recipes, username=session.get('username'))

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

@app.route('/recipe/<int:recipe_id>')
def recipe_detail(recipe_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    recipe = Recipe.query.get_or_404(recipe_id)
    
    #Global average calculation
    ratings = Rating.query.filter_by(recipe_id=recipe_id).all()
    if ratings:
        avg_val = round(sum([r.stars for r in ratings]) / len(ratings), 1)
    else:
        avg_val = "Not yet rated"
        
    #Check for current user's specific rating
    user_rating = Rating.query.filter_by(recipe_id=recipe_id, user_id=session['user_id']).first()
    user_stars = user_rating.stars if user_rating else None
    
    is_owner = (recipe.user_id == session['user_id'])
    
    return render_template('recipe_detail.html', 
                           recipe=recipe, 
                           avg_rating=avg_val, 
                           user_stars=user_stars,
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
        username = request.form['username']
        password = request.form['password']
        confirm = request.form['confirm_password']
        if password != confirm:
            return "Passwords do not match", 400
        if User.query.filter_by(username=username).first():
            return "Username already exists", 400
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
    query = request.args.get('q', '').strip()
    results_data = []
    
    if query:
        #Privacy Logic: Join with Recipe to check is_public OR ownership
        results = Recipe.query.outerjoin(Ingredient).filter(
            ((Recipe.name.contains(query)) |
             (Ingredient.name.contains(query)) |
             (Recipe.tags.contains(query))) &
            ((Recipe.is_public == True) | (Recipe.user_id == session.get('user_id')))
        ).distinct().all()

        for r in results:
            matched_ingredient = next((ing.name for ing in r.ingredients if query.lower() in ing.name.lower()), None)
            if matched_ingredient:
                match_context = f"Has ingredient: {matched_ingredient}"
            elif r.tags and query.lower() in r.tags.lower():
                match_context = f"Matched tag: {query}"
            else:
                match_context = None 
            
            results_data.append({'recipe': r, 'context': match_context})
            
    return render_template('search_results.html', results=results_data, query=query)
#API Routes

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    #BUG FIX: Filter by the logged-in user so you only see YOUR recipes
    #This keeps the Profile Dashboard private
    my_recipes = Recipe.query.filter_by(user_id=session['user_id']).all()
    
    output = []
    for r in my_recipes:
        ratings = Rating.query.filter_by(recipe_id=r.id).all()
        avg_val = round(sum([rt.stars for rt in ratings]) / len(ratings), 1) if ratings else "Not yet rated"
        output.append({
            'id': r.id, 
            'name': r.name, 
            'servings': r.servings,
            'tags': r.tags, 
            'creator': r.owner.username,
            'avg_rating': avg_val, 
            'forked_from': r.forked_from, 
        })
    return jsonify(output)


@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    data = request.json

    #BUG FIX: Name Validation
    if not data.get('name') or not data['name'].strip():
        return jsonify({'error': 'Recipe name cannot be blank'}), 400

    #BUG FIX: Servings Defaulting Logic
    try:
        servings = int(data.get('servings', 1))
        if servings < 1: servings = 1
    except:
        servings = 1

    new_recipe = Recipe(
        name=data['name'],
        servings=servings,
        instructions=data.get('instructions', ''), 
        tags=data.get('tags', ''),
        is_public=data.get('is_public', True),
        user_id=session['user_id']
    )
    
    db.session.add(new_recipe)
    db.session.flush() 

    for ing_data in data.get('ingredients', []):
        #We also validate ingredient names here
        if not ing_data.get('name'): continue
        new_ingredient = Ingredient(
            quantity=ing_data.get('quantity', '1'),
            unit=ing_data.get('unit', ''),
            name=ing_data['name'],
            recipe_id=new_recipe.id  
        )
        db.session.add(new_ingredient)

    db.session.commit()
    return jsonify({'message': 'Success', 'id': new_recipe.id}), 201

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
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    recipe = Recipe.query.get_or_404(recipe_id)
    if recipe.user_id == session['user_id']: return jsonify({'error': 'Cannot rate own recipe'}), 403
    data = request.json
    rating = Rating.query.filter_by(user_id=session['user_id'], recipe_id=recipe_id).first()
    if rating: rating.stars = data['stars']
    else: db.session.add(Rating(stars=data['stars'], user_id=session['user_id'], recipe_id=recipe_id))
    db.session.commit()
    return jsonify({'message': 'Rated'}), 200

@app.route('/api/recipes/<int:recipe_id>/comment', methods=['POST'])
def add_comment(recipe_id):
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    db.session.add(Comment(text=data['text'], user_id=session['user_id'], recipe_id=recipe_id, username=session['username']))
    db.session.commit()
    return jsonify({'message': 'Commented'}), 201

@app.route('/api/recipes/<int:recipe_id>/fork', methods=['POST'])
def fork_recipe(recipe_id):
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    
    original = Recipe.query.get_or_404(recipe_id)
    
    forked_recipe = Recipe(
        name=original.name,
        servings=original.servings,
        instructions=original.instructions,
        tags=original.tags,
        is_public=False,
        user_id=session['user_id'],
        forked_from=original.owner.username
    )
    
    db.session.add(forked_recipe)
    db.session.flush()

    for ing in original.ingredients:
        db.session.add(Ingredient(
            name=ing.name,
            quantity=ing.quantity,
            unit=ing.unit,
            recipe_id=forked_recipe.id
        ))
    
    db.session.commit()
    return jsonify({'message': 'Recipe forked!'}), 201


if __name__ == '__main__':
    with app.app_context(): db.create_all()
    app.run(debug=True, port=5000)

