// Supabase configuration
const SUPABASE_URL = 'https://nzpwmhshnfvwrbkhraed.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHdtaHNobmZ2d3Jia2hyYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzcyMTMsImV4cCI6MjA3OTExMzIxM30.IPQzkj0iuTEaxsmgY1fFva916rKcwaEfaAiBQhJHb_o';
      
// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let farmers = [];
let currentFarmer = null;

// Check authentication
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            // User not authenticated, redirect to sign in
            window.location.href = "SignIn.html";
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("Auth check error:", error);
        window.location.href = "SignIn.html";
        return false;
    }
}

// Load farmers from database
async function loadFarmers() {
    try {
        console.log("Loading farmers...");
        
        // First, let's try to get farmers from farmer_profiles directly
        const { data: farmerProfiles, error: farmerError } = await supabase
            .from('farmer_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (farmerError) {
            console.error("Error loading farmer profiles:", farmerError);
            return;
        }
        
        console.log("Farmer profiles data:", farmerProfiles);
        
        if (!farmerProfiles || farmerProfiles.length === 0) {
            console.log("No farmer profiles found");
            document.getElementById('farmer-grid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No farmers found.</p>';
            return;
        }
        
        // Now get user profiles for each farmer
        const userIds = farmerProfiles.map(fp => fp.user_id);
        const { data: userProfiles, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
        
        if (userError) {
            console.error("Error loading user profiles:", userError);
            return;
        }
        
        console.log("User profiles data:", userProfiles);
        
        // Combine the data
        farmers = farmerProfiles.map(fp => {
            const userProfile = userProfiles?.find(up => up.id === fp.user_id) || {};
            return {
                ...fp,
                profiles: userProfile
            };
        });
        
        console.log("Combined farmers data:", farmers);
        
        renderFarmers(farmers);
        
    } catch (error) {
        console.error("Error loading farmers:", error);
        document.getElementById('farmer-grid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading farmers. Please try again later.</p>';
    }
}

// Render farmers to the grid
function renderFarmers(farmerList) {
    console.log("Rendering farmers:", farmerList);
    const farmerGrid = document.getElementById('farmer-grid');
    farmerGrid.innerHTML = '';
    
    if (!farmerList || farmerList.length === 0) {
        farmerGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No farmers found.</p>';
        return;
    }
    
    farmerList.forEach(farmer => {
        console.log("Processing farmer:", farmer);
        const farmerCard = document.createElement('div');
        farmerCard.className = 'product-card';
        farmerCard.role = 'listitem';
        farmerCard.tabIndex = 0;
        farmerCard.setAttribute('data-id', farmer.id);
        
        // Get profile data
        const profile = farmer.profiles || {};
        
        // Create profile image with first letter of business name
        const businessName = farmer.business_name || 'Farm';
        const firstLetter = businessName.charAt(0).toUpperCase();
        
        // Use a consistent background color based on the first letter
        const colors = ['#4CAF50', '#FBC02D', '#66BB6A','#FDD835', '#81C784', '#FFEB3B'];
        const colorIndex = firstLetter.charCodeAt(0) % colors.length;
        const backgroundColor = colors[colorIndex];
        
        farmerCard.innerHTML = `
            <div class="product-image" style="
                background-color: ${backgroundColor};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                font-weight: bold;
                color: white;
                text-transform: uppercase;
            ">
                ${firstLetter}
            </div>
            <p class="name">${farmer.business_name || 'Business Name'}</p>
            <p class="owner">${farmer.owner_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Owner Name'}</p>
            <p class="location">${farmer.location || 'Location'}</p>
        `;
        
        // Add click event to open modal
        farmerCard.addEventListener('click', () => {
            openFarmerModal(farmer);
        });
        
        farmerGrid.appendChild(farmerCard);
    });
}

// Load farmer's crop categories from farmer_profiles table
async function loadFarmerCategories(farmer) {
    try {
        console.log("Loading categories for farmer:", farmer.business_name);
        
        // Get categories from farmer_profiles table
        const { data: farmerProfile, error } = await supabase
            .from('farmer_profiles')
            .select('crop_categories')
            .eq('id', farmer.id)
            .single();
        
        if (error) {
            console.error("Error loading categories:", error);
            return;
        }
        
        console.log("Farmer profile data:", farmerProfile);
        
        const categoriesList = document.getElementById('modalCategories');
        categoriesList.innerHTML = '';
        
        // Check if categories exist and are in the expected format
        if (!farmerProfile || !farmerProfile.crop_categories || farmerProfile.crop_categories.length === 0) {
            categoriesList.innerHTML = '<span style="color: #999;">No categories specified</span>';
            return;
        }
        
        // Create category tags
        farmerProfile.crop_categories.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = name;
            categoriesList.appendChild(tag);
        });
        
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Open farmer modal
async function openFarmerModal(farmer) {
    currentFarmer = farmer;
    const modal = document.getElementById('farmerModal');
    
    // Set farmer details in modal
    document.getElementById('modalFarmerBusinessName').textContent = farmer.business_name || 'Farm';
    document.getElementById('modalFarmerLocation').textContent = farmer.location || 'Location';
    document.getElementById('modalFarmerJoined').textContent = `Joined ${new Date(farmer.created_at).toLocaleDateString()}`;
    document.getElementById('modalFarmerReviews').textContent = '0'; // Will be updated later
    document.getElementById('modalFarmerDescription').textContent = farmer.description || 'No description available.';
    
    // Set avatar with first letter
    const businessName = farmer.business_name || 'Farm';
    const firstLetter = businessName.charAt(0).toUpperCase();
    const avatar = document.getElementById('modalAvatar');
    avatar.textContent = firstLetter;
    
    // Set avatar background color
    const colors = ['#4CAF50', '#FBC02D', '#66BB6A','#FDD835', '#81C784', '#FFEB3B'];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    avatar.style.backgroundColor = colors[colorIndex];
    
    // Load farmer's categories
    await loadFarmerCategories(farmer);
    
    // Load farmer's crops using user_id (UUID)
    await loadFarmerCrops(farmer.user_id);
    
    // Load farmer's reviews
    await loadFarmerReviews(farmer.user_id);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Load farmer's crops - UPDATED WITH DESCRIPTION FIELD
async function loadFarmerCrops(farmerId) {
    try {
        console.log("=== STARTING CROP LOADING ===");
        console.log("Farmer ID:", farmerId);
        console.log("Current farmer object:", currentFarmer);
        
        // Check if farmerId is valid
        if (!farmerId) {
            console.error("Farmer ID is null or undefined");
            document.getElementById('modal-crops-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error: Farmer ID is missing.</p>';
            return;
        }
        
        // Ensure farmerId is a UUID string
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(farmerId)) {
            console.error("Invalid UUID format:", farmerId);
            document.getElementById('modal-crops-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error: Invalid farmer ID format.</p>';
            return;
        }
        
        console.log("Querying crops table for farmer_id:", farmerId);
        
        const { data: crops, error } = await supabase
            .from('crops')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Supabase error details:", error);
            console.error("Error loading crops:", error.message);
            document.getElementById('modal-crops-list').innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading crops: ${error.message}</p>`;
            return;
        }
        
        console.log("Raw crops data from Supabase:", crops);
        console.log("Crops data type:", typeof crops);
        console.log("Is crops an array:", Array.isArray(crops));
        
        const cropsList = document.getElementById('modal-crops-list');
        console.log("Crops list element:", cropsList);
        
        if (!cropsList) {
            console.error("Crops list element not found!");
            return;
        }
        
        cropsList.innerHTML = '';
        
        // Check if crops is null or undefined
        if (!crops) {
            console.log("No crops data returned (null)");
            cropsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No crops available.</p>';
            return;
        }
        
        // Check if crops is an empty array
        if (Array.isArray(crops) && crops.length === 0) {
            console.log("Crops array is empty");
            cropsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No crops available.</p>';
            return;
        }
        
        // Ensure crops is an array
        const cropsArray = Array.isArray(crops) ? crops : [crops];
        console.log("Processing crops array:", cropsArray);
        
        // Display crops as non-clickable items with images - UPDATED
        cropsArray.forEach((crop, index) => {
            console.log(`Processing crop ${index + 1}:`, crop);
            
            // Create a container for the crop card
            const cropContainer = document.createElement('div');
            cropContainer.className = 'crop-container';
            
            const cropCard = document.createElement('div');
            cropCard.className = 'modal-card';
            
            // Create image element with proper handling
            const cropImage = document.createElement('div');
            cropImage.className = 'modal-card-img';
            
            // Check if crop has an image URL
            if (crop.image_url && crop.image_url.trim() !== '') {
                cropImage.style.backgroundImage = `url('${crop.image_url}')`;
                cropImage.style.backgroundSize = 'cover';
                cropImage.style.backgroundPosition = 'center';
                cropImage.style.backgroundColor = 'transparent';
            } else {
                // Use placeholder if no image
                cropImage.style.backgroundColor = '#f0f0f0';
                cropImage.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#676758" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                `;
                cropImage.style.display = 'flex';
                cropImage.style.alignItems = 'center';
                cropImage.style.justifyContent = 'center';
            }
            
            // Create the rest of the card content
            const title = document.createElement('div');
            title.className = 'modal-card-title';
            title.textContent = crop.name || 'Crop Name';
            
            const subtitle = document.createElement('div');
            subtitle.className = 'modal-card-subtitle';
            subtitle.textContent = `PHP ${crop.price || '0.00'}`;
            
            // Create description instead of location
            const descriptionDiv = document.createElement('div');
            descriptionDiv.className = 'modal-card-description';
            descriptionDiv.textContent = crop.description || 'No description available';
            
            // Build the card
            cropCard.appendChild(cropImage);
            cropCard.appendChild(title);
            cropCard.appendChild(subtitle);
            cropCard.appendChild(descriptionDiv);
            
            // Just append the card directly to the container (no link)
            cropContainer.appendChild(cropCard);
            cropsList.appendChild(cropContainer);
            
            console.log(`Added crop ${index + 1} to the list`);
        });
        
        console.log("=== CROP LOADING COMPLETED ===");
        
    } catch (error) {
        console.error("Unexpected error in loadFarmerCrops:", error);
        console.error("Error stack:", error.stack);
        document.getElementById('modal-crops-list').innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Unexpected error: ${error.message}</p>`;
    }
}

// Load farmer's reviews
async function loadFarmerReviews(farmerId) {
    try {
        console.log("Loading reviews for farmer ID:", farmerId);
        
        // First, get all crops for this farmer
        const { data: crops, error: cropsError } = await supabase
            .from('crops')
            .select('id')
            .eq('farmer_id', farmerId);
        
        if (cropsError) {
            console.error("Error loading crops for reviews:", cropsError);
            document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading reviews.</p>';
            return;
        }
        
        if (!crops || crops.length === 0) {
            document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No reviews available.</p>';
            return;
        }
        
        const cropIds = crops.map(crop => crop.id);
        
        // Get all reviews for these crops
        const { data: reviews, error: reviewsError } = await supabase
            .from('crop_reviews')
            .select('*')
            .in('crop_id', cropIds);
        
        if (reviewsError) {
            console.error("Error loading reviews:", reviewsError);
            document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading reviews.</p>';
            return;
        }
        
        const reviewsList = document.getElementById('modal-reviews-list');
        reviewsList.innerHTML = '';
        
        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No reviews available.</p>';
            return;
        }
        
        // Update review count
        document.getElementById('modalFarmerReviews').textContent = reviews.length;
        
        // Display reviews
        reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-name">${review.user_name || 'Anonymous'}</div>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                <div class="review-comment">${review.comment || 'No comment'}</div>
            `;
            
            reviewsList.appendChild(reviewItem);
        });
        
    } catch (error) {
        console.error("Error loading reviews:", error);
        document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading reviews.</p>';
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('farmerModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentFarmer = null;
}

// Modal tab switching
function setupModalTabs() {
    const tabs = document.querySelectorAll('.modal-tab');
    const panels = {
        'crops': document.getElementById('modal-crops-panel'),
        'reviews': document.getElementById('modal-reviews-panel')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active panel
            Object.values(panels).forEach(panel => panel.classList.remove('active'));
            panels[tabName].classList.add('active');
        });
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderFarmers(farmers);
            return;
        }
        
        const filtered = farmers.filter(farmer => {
            const profile = farmer.profiles || {};
            
            // Search by business name, owner name, or location
            return (
                farmer.business_name?.toLowerCase().includes(searchTerm) ||
                farmer.owner_name?.toLowerCase().includes(searchTerm) ||
                farmer.location?.toLowerCase().includes(searchTerm) ||
                profile.first_name?.toLowerCase().includes(searchTerm) ||
                profile.last_name?.toLowerCase().includes(searchTerm) ||
                profile.email?.toLowerCase().includes(searchTerm)
            );
        });
        
        renderFarmers(filtered);
    });
}

// Existing profile dropdown code
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

// Show dropdown on hover
profileBtn.addEventListener("mouseenter", () => {
    dropdownMenu.style.display = "flex";
});
dropdownMenu.addEventListener("mouseenter", () => {
    dropdownMenu.style.display = "flex";
});

// Hide when mouse leaves both
profileBtn.addEventListener("mouseleave", () => {
    setTimeout(() => {
        if (!dropdownMenu.matches(":hover")) {
            dropdownMenu.style.display = "none";
        }
    }, 150);
});
dropdownMenu.addEventListener("mouseleave", () => {
    dropdownMenu.style.display = "none";
});

// Modal event listeners
document.getElementById('closeModal').addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('farmerModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Follow button in modal
document.querySelector('.modal-btn-follow').addEventListener('click', function() {
    if (!this.classList.contains('following')) {
        // Change to green when following
        this.style.backgroundColor = '#4CAF50';
        this.style.color = 'white';
        this.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 5v14m7-7H5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Following
        `;
        this.classList.add('following');
    } else {
        // Change back to yellow when not following
        this.style.backgroundColor = '#FFEB3B';
        this.style.color = '#333';
        this.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 5v14m7-7H5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Follow
        `;
        this.classList.remove('following');
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing page...");
    
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }
    
    // Load farmers
    await loadFarmers();
    
    // Setup search
    setupSearch();
    
    // Setup modal tabs
    setupModalTabs();
});