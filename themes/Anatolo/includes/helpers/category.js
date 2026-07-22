const util = require('hexo-util');

/** @param {import("hexo")} hexo */
module.exports = function (hexo) {
  hexo.extend.helper.register('alphabet_category_list', function (categories, classNames) {
    classNames.a = classNames.a || 'tag_btn';
    classNames.count = classNames.count || 'tag_count';
    classNames.cat_group = classNames.cat_group || 'tag-group';
    classNames.title_tag = classNames.title_tag || 'div';
    classNames.title_class = classNames.title_class || 'listing-title';
    classNames.before = classNames.before || '';

    // Group categories by first letter (same logic as tags)
    const cat_dict = {};
    categories.forEach((cat) => {
      if (/^[0-9]/.test(cat.name)) {
        if (!cat_dict['0-9']) {
          cat_dict['0-9'] = [];
        }
        cat_dict['0-9'].push(cat);
      } else if (/^[a-zA-Z]/.test(cat.name)) {
        const firstL = cat.name[0].toUpperCase();
        if (!cat_dict[firstL]) {
          cat_dict[firstL] = [];
        }
        cat_dict[firstL].push(cat);
      } else {
        const firstL = '#';
        if (!cat_dict[firstL]) {
          cat_dict[firstL] = [];
        }
        cat_dict[firstL].push(cat);
      }
    });

    const htmls = [];

    Object.keys(cat_dict)
      .sort()
      .forEach((id) => {
        htmls.push(util.htmlTag(classNames.title_tag, { class: classNames.title_class }, id));
        htmls.push(`<div class="${classNames.cat_group}">`);
        cat_dict[id]
          .sort((cat1, cat2) => (cat1.name < cat2.name ? -1 : 1))
          .forEach((cat) => {
            htmls.push(
              `<a class="${classNames.a}" href="${this.url_for(cat.path)}">${classNames.before}${util.escapeHTML(cat.name)}<span class="${classNames.count}">${cat.length}</span></a>`,
            );
          });
        htmls.push(`</div>`);
      });

    return htmls.join('');
  });
};
