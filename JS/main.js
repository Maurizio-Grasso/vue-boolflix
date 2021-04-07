var app = new Vue ({
    el : '#root' ,
    data : {
        userQuery : '' ,
        movieList : [] ,
        apiKey : '37e7aa1edd3103b63a7d7516fa1047f8'
    } ,
    methods : {
        searchTitle(category) {
        // Questo metodo effettua una ricerca in base alla query inserita dall'utente
        // il parametro 'category' può essere uguale a 'movie' nel caso di film o 'tv' nel caso di serie televisive
            axios.get(`https://api.themoviedb.org/3/search/${category}` ,
                { params: {
                    api_key : this.apiKey ,
                    query : this.userQuery ,
                    page : 1    // Ma tutte le altre pagine che fine fanno?
                    }
                })
                .then( (response) =>  {                       
                    response.data.results.forEach((movie) => {                        
                        //  Per ogni titolo restituito tramie API lancia il metodo addItem 
                        //  il quale  si occupa di inserirne i relativi dati nell'array
                        this.addItem(movie , category);
                    });                    
                });

                if(category == 'movie') {
                    // Se la categoria sulla quale abbiamo lavorato è 'movie' 
                    // Richiama ricorsivamente la funzione passando come argomento 'tv'
                    // Così da ripetere la stessa ricerca anche per le serie televisive
                    this.searchTitle('tv');
                }
                else {
                    this.userQuery = '';
                }
                
            } ,

        addItem(movie , category) {
        //  Questo medodo si occupa di aggiungere all'array principale un singolo titolo
        //  l'argomento 'movie' contiene i dati ancora grezzi passati dalle API
        //  l'argomento 'category' può essere uguale a 'movie' o 'tv' a seconda che si tratti di film o serie TV
            
            var newMovie;   // Dichiaro variabile che conterrà l'oggetto temporaneo
            
            newMovie = {rating : Math.ceil(movie.vote_average / 2)};    // trasformo il voto in un valore intero da 1 a 5
            newMovie.flagLink = ''; // Inizializzo anche il link alla bandierina, che sarà ricavato in seguito
            if(movie.poster_path == null){
                // Se non viene fornito un poster tramite API
                newMovie.poster_path = 'img/image-placeholder.png';                
            }
            else {  
                //... in caso contrario
                newMovie.poster_path = `https://image.tmdb.org/t/p/w185${movie.poster_path}`;
            }

            if (category == 'tv') {
                // Se stiamo lavorando sul titolo di una Serie TV
                newMovie.title = movie.name;
                newMovie.original_title = movie.original_name;
                if (movie.origin_country.length > 0) {
                    // Se l'array 'origin_country' contiene informazioni prendo per buono il primo elemento
                    newMovie.country = movie.origin_country[0];
                }
                else{
                    // Se come spesso avviene l'array è vuoto, ripiego invece sulla lingua originale
                    newMovie.country = movie.original_language;
                }
            }
            else {
                // Se stiamo lavorando su un film (category == 'movie')
                newMovie.title = movie.title;
                newMovie.original_title = movie.original_title;
                // Per i film, le API non indicano il paese di origine
                // Devo arrangiarmi col campo 'lingua originale', benché questo dato sia spesso ambiguo
                newMovie.country = movie.original_language;
            }
            
            // Che si tratti di un film o di una serie, i dati sono adesso omogenei

            this.movieList.push(newMovie);  // Aggiungo il titolo all'array principale            
            this.getFlag(this.movieList.length - 1);    // aggiungo bandiera all'ultimo elemento
        },

        getFlag(index) {
        //  Questo metodo si occupa di ricavare il link ad una bandierina che corrisponde al Paese di origine del titolo
        //  Oppure coerente con la sua lingua originale (nel caso in cui il Paese di origine fosse ignoto)
            
            var langString = this.movieList[index].country;
        
            if((langString == 'en') || (langString == 'EN')) {                
                // 'EN' non corrisponde ad un Paese specifico ma è la lingua più frequente 
                //  Gestisco questo caso separatamente con una bandierina a metà fra quella inglese e quella statunitense
                this.movieList[index].flagLink = "https://upload.wikimedia.org/wikipedia/commons/a/a6/Us-uk.svg";
            }
            else {                
                //  ...altrimenti Cerco il link alla bandierina tramite il servizio RestCountries:
                axios.get('https://restcountries.eu/rest/v2/alpha/'+langString).then( (response) =>  {                 
                    this.movieList[index].flagLink = response.data.flag;
                }).catch( (error) => {  // Se la bandierina non si trova...
                    console.log('Bandierina non trovata: '+ error);
                    this.movieList[index].flagLink = false;
                  });
            }
        }
    }
});
