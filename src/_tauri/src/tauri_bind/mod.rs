
/* 四层里的第三层：跟壳、跟系统打交道的那一层 —— 命令注册、文件读写、对话框、窗口、持久化。
   判断在 core 那一层做完，这一层只照判断去动手。 */
pub mod backup_cmds;
pub mod box_cmds;
pub mod cfg_cmds;
pub mod code_cmds;
pub mod comp_cmds;
pub mod data_cmds;
pub mod fs_cmds;
pub mod img_cmds;
pub mod info_cmds;
pub mod log_cmds;
pub mod media_cmds;
pub mod pack_cmds;
pub mod page_cmds;
pub mod pick_cmds;
pub mod sys_cmds;
pub mod vol_cmds;
pub mod web_cmds;
pub mod win_cmds;
