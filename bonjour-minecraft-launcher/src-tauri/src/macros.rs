#[macro_export]
macro_rules! impl_level {
    (stub) => { "stub" };
    (partial) => { "partial" };
    (full) => { "full" };
}

#[macro_export]
macro_rules! command_meta {
    ($level:ident) => {
        #[doc = concat!("IMPL_LEVEL: ", impl_level!($level))]
    };
}
