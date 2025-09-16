package com.chatapp.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register plugins
        this.init(savedInstanceState, java.util.Arrays.asList(
            com.capacitorcommunity.contacts.ContactsPlugin.class
        ));
    }
}
