package com.ethernom.android.autofill.service.adapter;

import android.content.Context;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Filter;
import android.widget.Filterable;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.ethernom.android.autofill.service.AuthActivity;
import com.psdmgr.R;
import java.util.ArrayList;

public class AccountAdapter extends RecyclerView.Adapter<AccountAdapter.AccountViewHolder> implements Filterable {

    private ArrayList<AuthActivity.EtherEntry> list;
    private Context context;
    private ArrayList<AuthActivity.EtherEntry> contactListFiltered;

    // RecyclerView recyclerView;
    public AccountAdapter(Context c,ArrayList<AuthActivity.EtherEntry> mList) {
        this.list = mList;
        this.context = c;
        this.contactListFiltered = mList;
    }

    @NonNull
    @Override
    public AccountViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new AccountViewHolder(LayoutInflater.from(context).inflate(R.layout.item_account, parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull AccountViewHolder holder, int position) {
        holder.bind(contactListFiltered.get(position));
    }

    @Override
    public int getItemCount() {
        return contactListFiltered.size();
    }

    @Override
    public Filter getFilter() {

        return new Filter() {
            @Override
            protected FilterResults performFiltering(CharSequence charSequence) {
                String charString = charSequence.toString();

                Log.d("hhh", "fff : " + charString);
                if (charString.isEmpty()) {
                    contactListFiltered = list;
                } else {
                    ArrayList<AuthActivity.EtherEntry> filteredList = new ArrayList<>();
                    for (AuthActivity.EtherEntry row : list) {

                        // name match condition. this might differ depending on your requirement
                        // here we are looking for name or phone number match
                        if (row.username.toLowerCase().contains(charString.toLowerCase()) || row.URL.contains(charSequence)) {
                            filteredList.add(row);
                        }
                    }

                    contactListFiltered = filteredList;
                }

                FilterResults filterResults = new FilterResults();
                filterResults.values = contactListFiltered;
                return filterResults;
            }

            @Override
            protected void publishResults(CharSequence charSequence, FilterResults filterResults) {
                contactListFiltered = (ArrayList<AuthActivity.EtherEntry>) filterResults.values;
                notifyDataSetChanged();
            }
        };

    }


    class AccountViewHolder extends RecyclerView.ViewHolder{
        private TextView title, email;
        private LinearLayout ln_item;
        AccountViewHolder(@NonNull View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.tv_title);
            email = itemView.findViewById(R.id.tv_email);
            ln_item = itemView.findViewById(R.id.ln_item);
        }

        private void bind(AuthActivity.EtherEntry etherEntry){
            title.setText(etherEntry.username);
            email.setText(etherEntry.URL);

            RecyclerViewClickListener r = (RecyclerViewClickListener) context;
            ln_item.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    r.onClick(getAdapterPosition(), etherEntry);
                }
            });

        }
    }
}
