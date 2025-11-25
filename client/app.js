const { createApp } = Vue;

createApp({
    data() {
        return {
            lessons: [],
            cart: [],
            searchQuery: '',
            sortBy: '',
            sortOrder: 'asc',
            showCart: false,
            name: '',
            phone: '',
            orderMessage: ''
        };
    },
    computed: {
        filteredLessons() {
            let filtered = this.lessons.filter(lesson => {
                const search = this.searchQuery.toLowerCase();
                return lesson.topic.toLowerCase().includes(search) ||
                       lesson.location.toLowerCase().includes(search);
            });

            if (this.sortBy) {
                filtered.sort((a, b) => {
                    let valA = a[this.sortBy];
                    let valB = b[this.sortBy];
                    
                    if (typeof valA === 'string') {
                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    }

                    if (this.sortOrder === 'asc') {
                        return valA > valB ? 1 : -1;
                    } else {
                        return valA < valB ? 1 : -1;
                    }
                });
            }

            return filtered;
        }
    },
    methods: {
        validateName(name) {
            return /^[A-Za-z ]+$/.test(name);
        },
        validatePhone(phone) {
            return /^[0-9]{10,}$/.test(phone);
        },
        async fetchLessons() {
            try {
                const response = await fetch('http://localhost:3000/lessons');
                let lessons = await response.json();
                // Ensure a minimum of 5 spaces for every lesson
                lessons = lessons.map(l => ({
                    ...l,
                    spaces: l.spaces < 5 ? 5 : l.spaces
                }));
                this.lessons = lessons;
            } catch (error) {
                console.error('Error fetching lessons:', error);
            }
        },
        addToCart(lesson) {
            if (lesson.spaces > 0) {
                this.cart.push({ ...lesson });
                lesson.spaces--;
            }
        },
        removeFromCart(index) {
            const item = this.cart[index];
            const lesson = this.lessons.find(l => l.id === item.id);
            if (lesson) {
                lesson.spaces++;
            }
            this.cart.splice(index, 1);
        },
        clearCart() {
            // Restore lesson spaces before clearing
            for (const item of this.cart) {
                const lesson = this.lessons.find(l => l.id === item.id);
                if (lesson) lesson.spaces++;
            }
            this.cart = [];
        },
        async checkout() {
            if (!this.validateName(this.name)) {
                alert('Name must contain only letters and spaces');
                return;
            }
            if (!this.validatePhone(this.phone)) {
                alert('Phone must be at least 10 digits');
                return;
            }

            try {
                const orderResponse = await fetch('http://localhost:3000/orders', {
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
                    // Update spaces in database
                    for (const item of this.cart) {
                        await fetch(`http://localhost:3000/lessons/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ spaces: item.spaces })
                        });
                    }

                    // Show success message FIRST
                    this.orderMessage = 'Order placed successfully!';
                    
                    // Clear form
                    this.name = '';
                    this.phone = '';
                    
                    // Wait 3 seconds, then clear cart and go back
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
        this.fetchLessons();
    }
}).mount('#app');
