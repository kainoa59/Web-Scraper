const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

const axios = require("axios");
const cheerio = require("cheerio");

const db = require("./models")
const PORT = process.env.PORT || 3000;

const app = express();

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost/webscraper", {useNewUrlParser: true, useCreateIndex: true});

app.get("/scrape", (req, res) => {
    axios.get("http://nyt-mongo-scraper.herokuapp.com/").then(response => {
        const $ = cheerio.load(response.data);
        $(".card").each(function (i, element) {
            const result = {};
            result.title = $(this).children(".card-header").children("h3").text();
            result.link = $(this).children(".card-header").children("h3").attr("href");

            db.Article.create(result)
            .then(dbArticle => {
                console.log(dbArticle);
            })
            .catch(err => {
                console.log(err);
            });
        });
        res.send("Scrape Complete");
    });
});

app.get("/articles", (req, res) => {
    db.Article.find({})
      .then(dbArticle => {
        res.json(dbArticle);
      }).catch(err => {
        res.json(err);
      });
  });

app.get("/articles/:id", (req, res) => {
    db.Article
        .findOne({ _id: req.params.id })
        .populate("note")
        .then(dbArticle => {
            res.json(dbArticle);
        }).catch(err => {
            res.json(err);
        });
});

app.post("/articles/:id", (req, res) => {
    db.Note.create(req.body)
    .then(dbNote => {
        return db.Article.findOneAndUpdate({_id: req.params.id}, {note: dbNote._id}, {new: true});
    }).then(dbArticle => {
        res.json(dbArticle);
    }).catch(err => {
        res.json(err);
    });
});

app.delete("/note/:id", function (req, res) {
    db.Note.findByIdAndRemove({ _id: req.params.id })
        .then(function (dbNote) {

            return db.Article.findOneAndUpdate({ note: req.params.id }, { $pullAll: [{ note: req.params.id }]});
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`)
});