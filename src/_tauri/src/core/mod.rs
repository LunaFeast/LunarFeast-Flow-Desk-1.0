
/* 四层里的第一层：纯业务。
   这一层不碰磁盘、不碰壳、不碰 WebView —— 只做“该不该、是多少、叫什么名字”这类判断，
   拿 cargo test 就能验，不用起壳。动磁盘的那些全在 tauri_bind 那一层。 */
pub mod about_info;
pub mod app_deny;
pub mod backup_rule;
pub mod boot_path;
pub mod cat_rename;
pub mod cfg_value;
pub mod comp_rule;
pub mod data_path;
pub mod font_table;
pub mod fs_policy;
pub mod grid_snap;
pub mod icon_scan;
pub mod img_bytes;
pub mod log_line;
pub mod media_rule;
pub mod ming_mode;
pub mod ocr_boxes;
pub mod pack_rule;
pub mod page_pick;
pub mod perm_rule;
pub mod pick_policy;
pub mod web_page;
pub mod win_policy;
pub mod zip_pack;
