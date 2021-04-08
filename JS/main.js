var app = new Vue ({
    el : '#root' ,
    data : {
        userInput : '' ,
        movieList : [] ,
        apiKey : '37e7aa1edd3103b63a7d7516fa1047f8' ,
        typeOfContent : ['movie' , 'tv']
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
            
            var newItem;
            
            //  Punteggio:
            newItem = {rating : Math.ceil(data.vote_average / 2)};  

            // Trama:
            newItem.plot = data.overview;
            
            if(newItem.plot.length > 400) {
                //  Se la trama supera i 400 caratteri ne creiamo anche una versione tagliata
                newItem.truncatedPlot = newItem.plot.substring(0, 400) + '...';
            }
            
            //  Poster
            if(data.poster_path == null){
                newItem.poster_path = 'img/image-placeholder.png';
            }
            else {
                newItem.poster_path = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
            }

            //  Flag
            newItem.flagLink = false;   // Per ora mi limito ad aggiungere la proprietà. 

                // Alcune proprietà possiedono nomi diversi a seconda che si tratti di 'movie' o 'tv'. 
                // Diversifico quindi attraverso un if

            if (category == 'tv') {
            //  Titolo (Serie TV) 
                newItem.title = data.name;
            //  Titolo Originale (Serie TV) 
                newItem.original_title = data.original_name;
            //  Paese (Serie TV)
                if(data.origin_country.length > 0) {
                    // Se esiste la proprietà origin_country ben venga
                   newItem.country = data.origin_country[0];
                }
                else if(data.original_language) {
                    // Se non esiste origin_country prendo per buonna la original_language
                    newItem.country = data.original_language;
                }
                else {
                    // Se non c'è né l'una né l'altra mi attacco al
                   newItem.country = false;
                }
            }
            else if (category == 'movie'){
            //  Titolo (Film)             
                newItem.title = data.title;
            //  Titolo Orginale (Film)                             
                newItem.original_title = data.original_title;
            // Paese (Film)          
                if(data.production_countries.length > 0) {
                    // Se esiste la proprietà production_countries ben venga
                    newItem.country = data.production_countries[0].iso_3166_1;
                }
                else if(data.original_language) {
                    // Se non esiste production_countries prendo per buonna la original_language
                    newItem.country = data.original_language;
                }
                else {
                    // Se non c'è né l'una né l'altra mi attacco al
                    newItem.country = false;
                }
            }
            
            this.movieList.push(newItem);   // aggiungo il nuovo elemento all'array
            
            if(newItem.country) {
                //  Se siamo riusciti a ricavare il Paese di origine, generiamo la bandierina corrispondente
                this.getFlagLink(this.movieList.length - 1);
            }            
        } ,

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

    }
});
