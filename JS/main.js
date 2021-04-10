var app = new Vue ({
    el : '#root' ,
    data : {
        userInput : '' ,
        typeOfContent : ['movie' , 'tv'] ,
        movieList : [] ,
        genreList : [] ,
        filterBoxIsOpen : false ,
        visibleMovies : false ,
        fullPlotBox : {
            shown : false ,
            index : false
        },
        noPlotFound : 'Nessuna descrizione disponibile per questo titolo' ,
        apiKey : '37e7aa1edd3103b63a7d7516fa1047f8' 
    } ,
    methods : {


//  ------ Metodi strettamente legati alla ricerca ------

        
        searchTitle(category, query) {        
        // Questo metodo effettua una ricerca in base all'input dell'utente ('category') e della categoria di contenuto ('query') passati come argomento                        
        
            if(category == 'all') {
                // Se la categoria passata come argomento è 'all', invoca nuovamente la funzione per ciascun tipo di contenuto ('movie'e 'tv')
                this.resetAllData();    // Resetta Tutto
                for(type in this.typeOfContent) {
                    this.searchTitle(this.typeOfContent[type] , query);
                }
            }
            else {
                // Se come argomento è stato passato un tipo di contenuto conosciuto
                axios.get(`https://api.themoviedb.org/3/search/${category}` ,
                { params: {
                    api_key : this.apiKey ,
                    query : query ,
                    language : 'it-IT' ,
                    page : 1    // (Ma tutte le altre pagine che fine fanno?)
                }
                })
                .then( (response) =>  {
                    if(response.data.results.length > 0) {    
                        response.data.results.forEach((movie) => {
                            this.getDetails(movie.id , category);
                        });
                    }
                });
            }            
        } ,

        getDetails(id , category) {
        // Passati come parametri l'id e la category di un titolo, questo metodo fa un ulteriore chiamata API
        // Per ottenerne dettagli più approfonditi rispetto a quelli forniti dalla chiamata precedente
            
            axios.get(`https://api.themoviedb.org/3/${category}/${id}` ,
            { params: {
                api_key : this.apiKey ,
                language : 'it-IT' ,          
                }
            })
            .then( (response) =>  {
                // Ottenuti i dettagli del film li passiamo (ancora grezzi) al metodo addNewItem()
                this.addNewItem(response.data , category);
            });
        } ,

        getCast(movieId , category , index){
        //  Questo metodo lancia una chiamata API per ricavare il cast di un film.
        //  In seguito aggiunge un massimo di 5 attori alla relativa proprietà del film

            axios.get(`https://api.themoviedb.org/3/${category}/${movieId}/credits` ,
            { params: {
                api_key : this.apiKey ,
                language : 'it-IT'
                }
            })
            .then( (response) =>  {
                let cast = [];
                while( (cast.length < 5) && (cast.length < response.data.cast.length) ) {
                    cast.push(response.data.cast[cast.length].name);
                }
                if (cast.length > 0) {
                    this.movieList[index].cast = cast;
                }
            });
        },
    
        getFlagLink(index) {
            // Passata una stringa come parametro questo metodo cerca un link alla bandiera corrispondente
            // Attraverso una chiamata API al servizio RestCountries (che ringraziamo)
            
            var langString = this.movieList[index].country;
            
            if((langString == 'en') || ((langString == 'EN'))) {
                //  Se la stringa è 'en' inserisco manualmente una bandierina a metà inglese e statunitense
                this.movieList[index].flagLink = "https://upload.wikimedia.org/wikipedia/commons/a/a6/Us-uk.svg";
            }
            else if(langString != false) {            
                axios.get('https://restcountries.eu/rest/v2/alpha/'+langString).then( (response) =>  {
                    this.movieList[index].flagLink = response.data.flag;
                }).catch( (error) => {
                    // Se non trovo nessuna bandierina
                    console.log('Bandierina non trovata: '+ error);
                });
            }
        } ,


//  ------ Metodi legati alla manipolazione dei dati essenziali  ------        


        resetAllData() {
        //  Questo metodo riporta le proprietà assegnate a seguito di una ricerca sui valori iniziali

            this.movieList = [] ,
            this.genreList = [] ,
            this.userInput = '' ,
            this.visibleMovies = 0
        },

        addNewItem(data , category) {
            //  Passato come parametro l'oggetto contenente i dettagli di un film e la catagoria di appartenenza
            //  Questo metodo estrapola tutti i dettagli utili per la webApp, li rende omogenei e li inserisce nell'array
            
            var newItem = {
                rating : Math.ceil(data.vote_average / 2) ,
                flagLink : false ,
                cast : false ,
                genres : ['Genere Non Disponibile'] ,
                country : false ,
                poster_path : 'img/image-placeholder.png' ,
                visible : true
            };  
            
            //  Genre:
            if(data.genres.length > 0) {
                newItem.genres = [];
                data.genres.forEach(genre => {     
                    newItem.genres.push(genre.name);
                });               
            }
            
            newItem.genres.forEach(genre => {
                // Verifica se ci sono generi 'nuovi' fra quelli assegnati al film
                this.addNewGenre(genre);
            });               
                        
            //  Poster:
            if(data.poster_path){
                newItem.poster_path = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
            }

            // Trama:
            newItem.plot = data.overview;

                // Alcune proprietà possiedono nomi diversi a seconda che si tratti di 'movie' o 'tv'. 
                // Gestisco quindi i due casi separatamente attraverso un if

            if (category == 'tv') {
            //  Titolo (Serie TV) 
                newItem.title = data.name;
            //  Titolo Originale (Serie TV) 
                newItem.original_title = data.original_name;

            //  Paese (Serie TV)
                if(data.origin_country.length > 0) {
                   newItem.country = data.origin_country[0];
                }
            }
            else if (category == 'movie'){
            //  Titolo (Film)             
                newItem.title = data.title;
            //  Titolo Orginale (Film)                             
                newItem.original_title = data.original_title;
            // Paese (Film)          
                if(data.production_countries.length > 0) {
                    newItem.country = data.production_countries[0].iso_3166_1;
                }           
            }

            if(newItem.country == false) {
                // Se non sono riuscito a ricavare il paese di origine (perché non comunicato dall'API)
                // Allora tento di risalirvi dalla sua lingua originale, qualora presente
                if(data.original_language) {
                        newItem.country = data.original_language;
                    }
            }
            
            this.movieList.push(newItem);   //  Aggiungo il nuovo elemento all'array

            this.visibleMovies++;           //  Incremento numero di film visibili
            
            if(newItem.country) {
                //  Se siamo riusciti a ricavare il Paese di origine, generiamo la bandierina corrispondente
                this.getFlagLink(this.movieList.length - 1);
            }
            
            this.getCast(data.id , category , this.movieList.length - 1);
        } ,

        addNewGenre(currentGenre) {
        //  Questo metodo controlla se un determinato genere è già conosciuto.
        //  In caso contrario, lo aggiunge alla lista
            
            var foundNew = true;
            
            this.genreList.forEach(genre => {        
                if(genre.name == currentGenre){
                    foundNew = false;
                }
            });            
            
            if( foundNew == true ) {
                this.genreList.push({ 
                    'name' : currentGenre , 
                    'selected' : true
                });
            }
        } ,


//  ------ Metodi relativi al filtraggio dei dati ------


        toggleFilterBox() {
        //  Questo metodo apre e chiude il box con il filtro dei generi
        
            this.filterBoxIsOpen = this.filterBoxIsOpen == true ? false : true;
        } ,

        filterByGenre(){
        //  Questo metodo controlla se uno specifico film debba essere visibile o meno dopo che è stata eseguito un filtraggio per genere
            
        this.movieList.forEach(movie => {
                if( ( ( this.hasSelectedGenre(movie) ) && (!movie.visible) ) || ( (!this.hasSelectedGenre(movie) ) && (movie.visible) ) ) {
                    //  Se il film possiede generi filtrati ma è invisibile o se non ne possiede ma è visibile, allora ne cambio la visibilità
                    this.toggleMovieVisibility(movie);
                }
            });
        },

        hasSelectedGenre(movie) {        
        // Passato un 'movie' come parametro, questo metodo controlla se almeno uno dei suoi generi coincide con i generi filtrati dall'utente
        
            for(var index in movie.genres) {
                var currentGenre = movie.genres[index];            
                for(var genre in this.genreList) {
                    if((this.genreList[genre].name == currentGenre) && (this.genreList[genre].selected) ) {
                        return true;
                    }
                }
            }
            return false;
        } ,

        toggleMovieVisibility(movie){
        //  Questo metodo cambia la visibilità di un determinato film (se è 'true' diventa 'false' e viceversa)
            
            if(movie.visible){                
                movie.visible = false;
                this.visibleMovies--;
            }
            else {
                movie.visible = true;
                this.visibleMovies++;
            }
        },

        resetSelectedGenres() {
        // Questo metodo rende visibili tutti i generi
            for(var genre in this.genreList) {
                this.genreList[genre].selected = true;
            }
            this.filterByGenre();   // Questa invocazione fa fare tanto lavoro per niente: sai già che sono tutti visibili
        } ,

        
//  ------ Metodi relativi alla gestione ed alla manipolazione della trama  ------


        printOverview(movie) {
            //  Questo metodo si occupa di fornire una versione della trama di lunghezza 
            //  adatta allo spazio disponibile nel box relativo al film
            
            var plot = movie.plot;
            
            if (plot == '') {
                plot = this.noPlotFound;
            }
            else {                
                // Se la trama supera un determinato numero di caratteri ne stampo una versione 'tagliata'                
                var maxPlotLength = 400;  // lunghezza massima ammessa
                
                if( (movie.rating) && (movie.genres) && (movie.cast) && (movie.title != movie.original_title) ) {
                    // Se le condizioni sopra sono verificare, nel box rimarrà ancora meno spazio
                    // La lunghezza massima della trama dovrà quindi essere particolarmente ridotta
                    maxPlotLength = 200;
                }
                
                if(movie.plot.length > maxPlotLength) {
                    plot = plot.substring(0, maxPlotLength) + '...';
                }                
            }

            return plot;
        } ,

        showFullPlot(index) {
        //  Mostra Box contenente l'intera trama
            this.fullPlotBox.shown = true;
            this.fullPlotBox.index = index;
        },

        hideFullPlot() {
        //  Nasconde Box contenente l'intera trama
            this.fullPlotBox.shown = false;
            this.fullPlotBox.index = false;
        }
    }
});