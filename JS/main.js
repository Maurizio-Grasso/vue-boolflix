var app = new Vue ({
    el : '#root' ,
    data : {
        userInput : '' ,
        movieList : [] ,
        genreList : [] ,
        noGenre   : 'Genere Non Disponibile',
        filterBoxIsOpen : false ,
        typeOfContent : ['movie' , 'tv'] ,
        apiKey : '37e7aa1edd3103b63a7d7516fa1047f8' 
    } ,
    mounted() {
        this.genreList.push({name : this.noGenre , selected : true});
    } ,
    methods : {
        searchTitle(category, query) {
        // Questo metodo effettua una ricerca in base all'input dell'utente ('category') e della categoria di contenuto ('query') passati come argomento
        this.movieList = [] ,
        this.userInput = '';    // Reset UserInput (si lavora sulla sua copia 'query')

        if(category == 'all') {
            // Se la categoria passata come argomento è 'all', invoca nuovamente la funzione per ciascun tipo di contenuto ('movie'e 'tv')
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
                response.data.results.forEach((movie) => {
                    this.getDetails(movie.id , category);
                });
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

        addNewItem(data , category) {
            //  Passato come parametro l'oggetto contenente i dettagli di un film e la catagoria di appartenenza
            //  Questo metodo estrapola tutti i dettagli utili per la webApp, li rende omogenei e li inserisce nell'array
            
            var newItem = {
                rating : Math.ceil(data.vote_average / 2) ,
                flagLink : false ,
                cast : false ,
                genres : [] ,
                country : false ,
                poster_path : 'img/image-placeholder.png'
            };  
            
            //  Genre

            if(data.genres.length > 0) {                
                data.genres.forEach(genre => {     
                    newItem.genres.push(genre.name);
                    this.addNewGenre(genre.name);
                });               
            }
            else {
                newItem.genres.push(this.noGenre);
            }
            
            //  Poster

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
            
            this.movieList.push(newItem);   // aggiungo il nuovo elemento all'array
            
            if(newItem.country) {
                //  Se siamo riusciti a ricavare il Paese di origine, generiamo la bandierina corrispondente
                this.getFlagLink(this.movieList.length - 1);
            }
            
            this.getCast(data.id , category , this.movieList.length - 1);
        } ,

        toggleFilterBox() {
            this.filterBoxIsOpen = this.filterBoxIsOpen == true ? false : true;
        } ,

        hasSelectedGenre(movie) {        
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

        resetSelectedGenres() {
            for(var genre in this.genreList) {
                this.genreList[genre].selected = true;
                }
        } ,

        addNewGenre(currentGenre) {

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

        getCast(movieId , category , index){
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

            var langString = this.movieList[index].country

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

        printOverview(movie) {
            //  Questo metodo si occupa di fornire una versione della trama di lunghezza 
            //  adatta allo spazio disponibile nel box relativo al film

            var plot = movie.plot;

            if (plot == '') {
                plot = 'Nessuna descrizione disponibile per questo titolo';
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
        }
     }
});