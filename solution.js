const request = require('request');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const fs = require('fs');
const async = require("async");

//environment
const API_URL = 'https://www.bankmega.com/promolainnya.php';
const AJAX_URL = 'https://www.bankmega.com/ajax.promolainnya.php';
const WEB_URL = 'https://bankmega.com';
//data
let categories = [];
let subcategories = [];
let subcategoryData = {};
let categoryData = {};
let jsonData = {};

const fetchData = async() => {
  try {
    await request({
      method: 'GET',
      url: API_URL
    }, (err, res, body) => {
      if (!err) {
        const $ = cheerio.load(body);
        console.log('magic is starting');
        getCategory($);
        clickCategory(categories);
        setTimeout(() => {
          getDetailInfo(categoryData);
        }, 3000);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

const setUrl = (category, subcat, $) => {
  try {
    $('#promolain').children().map((index, item) => {
      if ($(item).children().attr('href').includes('promo_detail')) {
        if (subcat) {
          if (!(category in categoryData)) categoryData[category] = {};
          if (!(subcat in categoryData[category])) categoryData[category][subcat] = [];
          if (!(subcat in subcategoryData)) subcategoryData[subcat] = [];
          if ($(item).children().attr('href').includes('https://www.bankmega.com/')) {
            categoryData[category][subcat].push($(item).children().attr('href'));
            subcategoryData[subcat].push($(item).children().attr('href'));
          } else {
            categoryData[category][subcat].push('https://www.bankmega.com/' + $(item).children().attr('href'));
            subcategoryData[subcat].push('https://www.bankmega.com/' + $(item).children().attr('href'));
          }
        } else {
          if (!(category in categoryData)) categoryData[category] = [];
          if ($(item).children().attr('href').includes('https://www.bankmega.com/')) {
            categoryData[category].push($(item).children().attr('href'));
          } else {
            categoryData[category].push('https://www.bankmega.com/' + $(item).children().attr('href'));
          }
        }

      }
    })
  } catch (err) {
    console.error(err);
  }
}

const getCategory = ($) => {
  try {
    $('#contentpromolain2').filter((i, el) => {
      let data = $(el).children().first().children().next().first().children();
      data.map((index, item) => {
        if (index > 0) {
          categories.push($(item).attr("id"));
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

const clickCategory = (data) => {
  data.map(async(item, index) => {
    try {
      let product = index + 1
      await request({
        method: 'GET',
        url: AJAX_URL + `?product=${product}`
      }, (err, res, body) => {
        if (!err) {
          let $ = cheerio.load(body);
          let isSubcat = false;
          if ($('div').find('#subcatpromo').length > 0) {
            let subcat = $('div').find('#subcatpromo').children();
            subcat.map((index, item) => {
              subcategories.push($(item).children().attr('title'));
            })
            isSubcat = true;
          }
          let category = $('div').find('.menupromoinside').text();
          getDataPerPage(category, product, isSubcat, $);
        }
      });
    } catch (err) {
      console.error(err);
    }
  });
}

const getDataPerPage = async(category, product, isSubcat = false, $) => {
  if (isSubcat) {
    subcategories.map(async(item, index) => {
      try {
        let subcat = index + 1;
        await request({
          method: 'GET',
          url: AJAX_URL + `?product=${product}&subcat=${subcat}`
        }, (err, res, body) => {
          if (!err) {
            let $$ = cheerio.load(body);
            let total_page = $$('.tablepaging').children().children().children().last().children().attr('title').split(" ").slice(-1)[0];
            const mapLoop = async() => {
              for (let i = 1; i <= total_page; i++) {
                try {
                  await request({
                    method: 'GET',
                    url: AJAX_URL + `?product=${product}&subcat=${subcat}&page=${i}`
                  }, (err, res, body) => {
                    if (!err) {
                      let $$$ = cheerio.load(body);
                      setUrl(category, item, $$$);
                    }
                  });
                } catch (err) {
                  console.error(err);
                }
              }
            }
            mapLoop();
          }
        });
      } catch (err) {
        console.error(err);
      }
    });
  } else {
    let total_page = $('.tablepaging').children().children().children().last().children().attr('title').split(" ").slice(-1)[0];
    for (let i = 1; i <= total_page; i++) {
      try {
        await request({
          method: 'GET',
          url: AJAX_URL + `?product=${product}&page=${i}`
        }, (err, res, body) => {
          if (!err) {
            let $$ = cheerio.load(body);
            setUrl(category, null, $$);
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
  }
}

//get detail data
const getDetailInfo = (urls) => {
  async.forEach(urls, async(val, next) => {
    try {
      if (val.map) {
        await Promise.all(val.map(requestDetailInfo));
      } else {
        async.forEach(val, async(_val, next) => {
          try {
            await Promise.all(_val.map(requestDetailInfo));
          } catch (err) {
            console.error(err);
          }
        })
      }
      setJson(jsonData);
    } catch (err) {
      console.error(err);
    }
  });
}

const requestDetailInfo = async(url) => {
  try {
    await new Promise((resolve, reject) => {
      let req = request(url, (err, res, body) => {
        if (!err) {
          let $ = cheerio.load(body);
          let category = getParentName(categoryData, url);
          let subcategory = ''
          if (category === 'Kartu Kredit') {
            subcategory = getParentName(subcategoryData, url);
          }
          resolve(getDetail(category, subcategory, $))
        }
      });
    });
    process.stdout.write(".");
  } catch (err) {
    console.error(err)
  }
};

const getDetail = (category, subcategory, $) => {
  $('#contentpromolain2').filter((i, el) => {
    let element = $(el);
    let title = '',
      area = '',
      period = '',
      image = '';
    if (element.find('.titleinside').length > 0) {
      title = element.find('.titleinside').children().text();
    }
    if (element.find('.area').length > 0) {
      area = element.find('.area').children().text();
    }
    if (element.find('.periode').length > 0) {
      period = element.find('.periode').find('b').text();
    }
    if (element.find('.keteranganinside').length > 0) {
      image = element.find('.keteranganinside').find('img').attr('src');
    }

    let data = {
      "title": title,
      "area": area,
      "period": period,
      "imageurl": WEB_URL + image
    }

    if (subcategory !== '') {
      if (!(category in jsonData)) jsonData[category] = {};
      if (!(subcategory in jsonData[category])) jsonData[category][subcategory] = [];
      jsonData[category][subcategory].push(data);
    } else {
      if (!(category in jsonData)) jsonData[category] = [];
      jsonData[category].push(data);
    }
  })
};
//function
const setJson = async(data) => {
  await fs.writeFile('solution.json', JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.log('error', err.message);
    }
  })
};

const getParentName = (object, value) => {
  try {
    return Object.keys(object).find(key => object[key].includes(value));
  } catch (err) {
    return 'Kartu Kredit';
  }
};

//start
fetchData();