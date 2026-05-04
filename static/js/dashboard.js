// static/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const currentUsername = window.APP_DATA?.username;

    const userEl = document.getElementById('current-user');
    if (userEl) userEl.innerText = currentUsername;

    function renderGrid(recipes) {
        const originalGrid = document.getElementById('original-recipes-grid');
        const forkedGrid = document.getElementById('forked-recipes-grid');

        if (!originalGrid || !forkedGrid) return;

        originalGrid.innerHTML = '';
        forkedGrid.innerHTML = '';

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card card';

            const rating = recipe.avg_rating === "Not yet rated" ? "Not yet rated" : `${recipe.avg_rating} ⭐`;

            card.innerHTML = `
                <h3><a class="recipe-link" href="/recipe/${recipe.id}">${recipe.name}</a></h3>
                <p><strong>Servings:</strong> ${recipe.servings}</p>
                <p><strong>Rating:</strong> ${rating}</p>
                <p><strong>Calories:</strong> ${recipe.calories || 0}</p>
                <div style="margin: 10px 0;">
                    <a href="/edit_recipe/${recipe.id}"><button class="btn btn-secondary" type="button">Edit Recipe</button></a>
                </div>
                ${recipe.forked_from 
                    ? `<p class="recipe-meta" style="font-style: italic;">Forked from: ${recipe.forked_from}</p>`
                    : `<p class="recipe-meta" style="font-weight: bold; color: var(--orange);">Original Recipe</p>`
                }
            `;

            if (recipe.forked_from) {
                forkedGrid.appendChild(card);
            } else {
                originalGrid.appendChild(card);
            }
        });
    }

    async function loadDashboard() {
        // Fetch only the recipes for the logged-in user
        const res = await fetch('/api/recipes');
        if (res.ok) {
            const data = await res.json();
            renderGrid(data);
        }
    }

    document.getElementById('add-ingredient-btn')?.addEventListener('click', () => {
        const container = document.getElementById('ingredient-container');

        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row form-row';

        newRow.innerHTML = `
            <input type="text" class="form-input ing-qty" placeholder="Qty" style="width: 70px;">
            <select class="form-select ing-unit" style="width: 120px;">
                <option value="">Unit</option>
                <option value="tsp">tsp</option>
                <option value="tbsp">tbsp</option>
                <option value="cup">cup</option>
                <option value="g">g</option>
                <option value="oz">oz</option>
                <option value="ml">ml</option>
                <option value="lb">lb</option>
                <option value="pinch">pinch</option>
                <option value="piece">piece</option>
            </select>
            <input type="text" class="form-input ing-name" placeholder="Ingredient Name" style="flex: 1;">
        `;

        container.appendChild(newRow);
    });

    document.getElementById('btn-create-recipe')?.addEventListener('click', async () => {
        const nameEl = document.getElementById('new-recipe-name');
        const servingEl = document.getElementById('new-serving-size');
        const instructionsEl = document.getElementById('new-instructions');
        const tagsEl = document.getElementById('new-tags');
        const isPublicEl = document.getElementById('new-is-public');
        
        // Nutrition Elements
        const calEl = document.getElementById('new-calories');
        const protEl = document.getElementById('new-protein');
        const carbEl = document.getElementById('new-carbs');
        const fatEl = document.getElementById('new-fat');

        if (!nameEl.value.trim()) return alert('Recipe name cannot be blank!');

        const rows = document.querySelectorAll('.ingredient-row');

        const ingredients = Array.from(rows).map(row => ({
            quantity: row.querySelector('.ing-qty').value,
            unit: row.querySelector('.ing-unit').value,
            name: row.querySelector('.ing-name').value
        })).filter(ing => ing.name.trim() !== "");

        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameEl.value,
                servings: servingEl.value,
                instructions: instructionsEl.value,
                ingredients: ingredients,
                tags: tagsEl.value,
                is_public: isPublicEl.checked,
                // Include Nutrition Data
                calories: parseInt(calEl.value) || 0,
                protein: parseInt(protEl.value) || 0,
                carbs: parseInt(carbEl.value) || 0,
                fat: parseInt(fatEl.value) || 0
            })
        });

        if (response.ok) {
            // Full UI Reset
            nameEl.value = '';
            servingEl.value = '1';
            instructionsEl.value = '';
            tagsEl.value = '';
            calEl.value = '0';
            protEl.value = '0';
            carbEl.value = '0';
            fatEl.value = '0';
            
            //Reset ingredients to just one row
            document.getElementById('ingredient-container').innerHTML = `
                <p class="section-label"><strong>Ingredients:</strong></p>
                <div class="ingredient-row form-row">
                    <input class="form-input ing-qty" type="text" placeholder="Qty" style="width: 70px;">
                    <select class="form-select ing-unit" style="width: 120px;"><option value="">Unit</option><option value="tsp">tsp</option><option value="g">g</option></select>
                    <input class="form-input ing-name" type="text" placeholder="Ingredient Name" style="flex: 1;">
                </div>`;

            loadDashboard();
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to create recipe');
        }
    });

    loadDashboard();
});
