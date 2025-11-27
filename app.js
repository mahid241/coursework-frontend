const { createApp } = Vue; // Import Vue

createApp({ // Start of Vue application
    data() {
        // All reactive variables for your app
        return {
            lessons: [],       // Array to hold all lesson data
            cart: [],          // Array for items user adds to cart
            searchQuery: '',   // What user types into the search field
            sortBy: '',        // Active sort type chosen by user
            sortOrder: 'asc',  // Ascending/Descending sort order
            showCart: false,   // Whether to display the Cart page
            name: '',          // Name entered at checkout
            phone: '',         // Phone entered at checkout
            orderMessage: ''   // Message after placing order
        };
    },
    computed: {
        // Filter and sort lessons based on user input
        filteredLessons() {
            let filtered = this.lessons.filter(lesson => {
                const search = this.searchQuery.toLowerCase(); // Lowercase search
                // Returns lessons that match the search in topic or location
                return lesson.topic.toLowerCase().includes(search) ||
                    lesson.location.toLowerCase().includes(search);
            });

            // Sort lessons if a sort type is selected
            if (this.sortBy) {
                filtered.sort((a, b) => {
                    let valA = a[this.sortBy];
                    let valB = b[this.sortBy];

                    // If sorting by string, compare lowercase
                    if (typeof valA === 'string') {
                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    }

                    // Sorting order logic
                    if (this.sortOrder === 'asc') {
                        return valA > valB ? 1 : -1;
                    } else {
                        return valA < valB ? 1 : -1;
                    }
                });
            }

            return filtered; // Return the filtered & sorted lesson list
        }
    },
    methods: {
        // Validate that the name has only letters and spaces
        validateName(name) {
            return /^[A-Za-z ]+$/.test(name);
        },
        // Validate phone contains at least 10 digits
        validatePhone(phone) {
            return /^[0-9]{10,}$/.test(phone);
        },
        // Get lessons data from your backend API
        async fetchLessons() {
            try {
                const response = await fetch('https://coursework-backend-rcvf.onrender.com/lessons');
                let lessons = await response.json();
                // Ensure every lesson has at least 5 spaces
                lessons = lessons.map(l => ({
                    ...l,
                    spaces: l.spaces < 5 ? 5 : l.spaces
                }));
                this.lessons = lessons; // Save to app
            } catch (error) {
                console.error('Error fetching lessons:', error); // Print error in console
            }
        },
        // Add a lesson to the cart, reduce available spaces
        addToCart(lesson) {
            if (lesson.spaces > 0) {
                this.cart.push({ ...lesson }); // Add to cart
                lesson.spaces--; // Remove a space
            }
        },
        // Remove an item from the cart, add space back to lesson
        removeFromCart(index) {
            const item = this.cart[index];
            const lesson = this.lessons.find(l => l.id === item.id);
            if (lesson) {
                lesson.spaces++; // Return space to lesson
            }
            this.cart.splice(index, 1); // Remove from cart array
        },
        // Empty the entire cart and reset lesson spaces
        clearCart() {
            for (const item of this.cart) {
                const lesson = this.lessons.find(l => l.id === item.id);
                if (lesson) lesson.spaces++; // Restore space for each lesson in cart
            }
            this.cart = [];
        },
        // Triggered when user clicks "Complete Purchase"
        async checkout() {
            // Validate name and phone before ordering
            if (!this.validateName(this.name)) {
                alert('Name must contain only letters and spaces');
                return;
            }
            if (!this.validatePhone(this.phone)) {
                alert('Phone must be at least 10 digits');
                return;
            }

            try {
                // Create order in backend
                const orderResponse = await fetch('https://coursework-backend-rcvf.onrender.com/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: this.name,
                        phone: this.phone,
                        lessonIDs: this.cart.map(item => item.id),
                        spaces: this.cart.length
                    })
                });

                if (orderResponse.ok) {
                    // For each cart item, update lesson spaces in backend
                    for (const item of this.cart) {
                        await fetch(`https://coursework-backend-rcvf.onrender.com/lessons/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ spaces: item.spaces })
                        });
                    }

                    // Show feedback to user
                    this.orderMessage = 'Order placed successfully!';

                    // Clear form fields
                    this.name = '';
                    this.phone = '';

                    // Wait, then clean up cart, hide cart, reload lesson data
                    setTimeout(() => {
                        this.cart = [];
                        this.orderMessage = '';
                        this.showCart = false;
                        this.fetchLessons();
                    }, 3000);
                } else {
                    alert('Order failed. Please try again.');
                }
            } catch (error) {
                console.error('Error during checkout:', error);
                alert('Checkout failed. Please try again.');
            }
        }
    },
    mounted() {
        // Runs once after the app loads; gets the latest lessons
        this.fetchLessons();
    }
}).mount('#app'); // Attach this app to the div with id="app"
